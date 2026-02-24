using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

/// <summary>
/// Résultat de la création d'une sauvegarde : fichier et clé de restauration (affichée une seule fois).
/// </summary>
public sealed class BackupCreateResult
{
    public byte[] FileBytes { get; init; } = Array.Empty<byte>();
    public string RestoreKey { get; init; } = string.Empty; // Base64 de la clé AES
}

/// <summary>
/// Sauvegarde et restauration de la configuration du portail (fichier chiffré).
/// Format v3 : clé NON stockée dans le fichier ; affichée une fois à l'admin ; demandée à la restauration.
/// </summary>
public interface IBackupRestoreService
{
    Task<BackupCreateResult> CreateBackupAsync(string createdBy, CancellationToken ct = default);
    Task RestoreBackupAsync(Stream backupStream, string? restoreKey, CancellationToken ct = default);
}

public class BackupRestoreService : IBackupRestoreService
{
    private const string FileHeader = "IWMBACKUP";
    private static readonly byte[] HeaderBytes = Encoding.UTF8.GetBytes(FileHeader + "\0");
    private const byte BackupFormatVersionLegacy = 1;   // ancien : chiffré avec clé app (EncryptionService)
    private const byte BackupFormatVersionEmbeddedKey = 2; // v2 : clé + IV dans le fichier
    private const byte BackupFormatVersionUserKey = 3;     // v3 : clé NON dans le fichier, fournie à la restauration
    private const int AesKeySizeBytes = 32;
    private const int AesBlockSizeBytes = 16;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IConfigService _configService;
    private readonly IConfigRepository _repository;
    private readonly IEncryptionService _encryption;
    private readonly IWebHostEnvironment _env;
    private readonly ILoggerFactory _loggerFactory;
    private readonly StorageSettings _storageSettings;

    public BackupRestoreService(
        IConfigService configService,
        IConfigRepository repository,
        IEncryptionService encryption,
        IWebHostEnvironment env,
        ILoggerFactory loggerFactory,
        StorageSettings storageSettings)
    {
        _configService = configService;
        _repository = repository;
        _encryption = encryption;
        _env = env;
        _loggerFactory = loggerFactory;
        _storageSettings = storageSettings;
    }

    public async Task<BackupCreateResult> CreateBackupAsync(string createdBy, CancellationToken ct = default)
    {
        var users = await _configService.GetUsersConfigAsync();
        var features = await _configService.GetFeaturesConfigAsync();
        var settings = await _configService.GetSettingsAsync();
        var audit = await _configService.GetAuditLogsAsync();
        var azureAd = await _configService.GetAzureAdSecretsAsync();

        var backup = new PortalBackup
        {
            Version = PortalBackup.FormatVersion,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = createdBy,
            Storage = new StorageSettings
            {
                Provider = _storageSettings.Provider,
                ConnectionString = _storageSettings.ConnectionString,
                Server = _storageSettings.Server,
                Port = _storageSettings.Port,
                Database = _storageSettings.Database,
                UserId = _storageSettings.UserId,
                Password = _storageSettings.Password,
                IntegratedSecurity = _storageSettings.IntegratedSecurity
            },
            Users = users,
            Features = features,
            Settings = settings,
            Audit = audit,
            AzureAd = azureAd
        };

        var json = JsonSerializer.Serialize(backup, JsonOptions);
        var plainBytes = Encoding.UTF8.GetBytes(json);

        byte[] key, iv;
        using (var rng = RandomNumberGenerator.Create())
        {
            key = new byte[AesKeySizeBytes];
            iv = new byte[AesBlockSizeBytes];
            rng.GetBytes(key);
            rng.GetBytes(iv);
        }

        var ciphertext = EncryptAesCbc(plainBytes, key, iv);

        // Format v3 : clé NON stockée dans le fichier (affichée une seule fois à l'admin)
        using var ms = new MemoryStream();
        ms.Write(HeaderBytes, 0, HeaderBytes.Length);
        ms.WriteByte(BackupFormatVersionUserKey);
        ms.Write(iv, 0, iv.Length);
        var len = BitConverter.GetBytes(ciphertext.Length);
        if (BitConverter.IsLittleEndian) Array.Reverse(len);
        ms.Write(len, 0, 4);
        ms.Write(ciphertext, 0, ciphertext.Length);

        var restoreKeyBase64 = Convert.ToBase64String(key);
        return new BackupCreateResult { FileBytes = ms.ToArray(), RestoreKey = restoreKeyBase64 };
    }

    public async Task RestoreBackupAsync(Stream backupStream, string? restoreKey, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        await backupStream.CopyToAsync(ms, ct);
        var raw = ms.ToArray();

        if (raw.Length < HeaderBytes.Length + 1)
            throw new InvalidOperationException("Fichier de sauvegarde invalide (trop court).");

        for (int i = 0; i < HeaderBytes.Length; i++)
        {
            if (raw[i] != HeaderBytes[i])
                throw new InvalidOperationException("Fichier de sauvegarde invalide (en-tête incorrect).");
        }

        int version = raw[HeaderBytes.Length];
        int payloadStart = HeaderBytes.Length + 1;
        string json;

        if (version == BackupFormatVersionUserKey)
        {
            // Format v3 : clé fournie par l'utilisateur, pas dans le fichier (IV + ciphertext uniquement)
            if (string.IsNullOrWhiteSpace(restoreKey))
                throw new InvalidOperationException("Clé de restauration requise pour ce fichier. Collez la clé affichée une seule fois lors de la sauvegarde.");
            if (raw.Length < payloadStart + AesBlockSizeBytes + 4)
                throw new InvalidOperationException("Fichier de sauvegarde invalide (format v3 tronqué).");
            byte[] key;
            try
            {
                key = Convert.FromBase64String(restoreKey.Trim());
            }
            catch
            {
                throw new InvalidOperationException("Clé de restauration invalide (format Base64 attendu).");
            }
            if (key.Length != AesKeySizeBytes)
                throw new InvalidOperationException("Clé de restauration incorrecte.");

            var iv = new byte[AesBlockSizeBytes];
            Buffer.BlockCopy(raw, payloadStart, iv, 0, AesBlockSizeBytes);
            var lenBytes = new byte[4];
            Buffer.BlockCopy(raw, payloadStart + AesBlockSizeBytes, lenBytes, 0, 4);
            if (BitConverter.IsLittleEndian) Array.Reverse(lenBytes);
            int cipherLen = BitConverter.ToInt32(lenBytes, 0);
            int cipherStart = payloadStart + AesBlockSizeBytes + 4;
            if (raw.Length < cipherStart + cipherLen || cipherLen < 0)
                throw new InvalidOperationException("Fichier de sauvegarde invalide (longueur contenu invalide).");
            var ciphertext = new byte[cipherLen];
            Buffer.BlockCopy(raw, cipherStart, ciphertext, 0, cipherLen);
            try
            {
                var plainBytes = DecryptAesCbc(ciphertext, key, iv);
                json = Encoding.UTF8.GetString(plainBytes);
            }
            catch (CryptographicException)
            {
                throw new InvalidOperationException("Clé de restauration incorrecte. La restauration est annulée.");
            }
        }
        else if (version == BackupFormatVersionEmbeddedKey)
        {
            // Format v2 : clé + IV dans le fichier (indépendant de la clé app)
            if (raw.Length < payloadStart + AesKeySizeBytes + AesBlockSizeBytes + 4)
                throw new InvalidOperationException("Fichier de sauvegarde invalide (format v2 tronqué).");
            var key = new byte[AesKeySizeBytes];
            var iv = new byte[AesBlockSizeBytes];
            Buffer.BlockCopy(raw, payloadStart, key, 0, AesKeySizeBytes);
            Buffer.BlockCopy(raw, payloadStart + AesKeySizeBytes, iv, 0, AesBlockSizeBytes);
            var lenBytes = new byte[4];
            Buffer.BlockCopy(raw, payloadStart + AesKeySizeBytes + AesBlockSizeBytes, lenBytes, 0, 4);
            if (BitConverter.IsLittleEndian) Array.Reverse(lenBytes);
            int cipherLen = BitConverter.ToInt32(lenBytes, 0);
            int cipherStart = payloadStart + AesKeySizeBytes + AesBlockSizeBytes + 4;
            if (raw.Length < cipherStart + cipherLen || cipherLen < 0)
                throw new InvalidOperationException("Fichier de sauvegarde invalide (longueur contenu invalide).");
            var ciphertext = new byte[cipherLen];
            Buffer.BlockCopy(raw, cipherStart, ciphertext, 0, cipherLen);
            var plainBytes = DecryptAesCbc(ciphertext, key, iv);
            json = Encoding.UTF8.GetString(plainBytes);
        }
        else if (version == BackupFormatVersionLegacy)
        {
            // Ancien format : chiffré avec clé applicative
            var encrypted = Encoding.UTF8.GetString(raw, payloadStart, raw.Length - payloadStart);
            json = _encryption.Decrypt(encrypted);
        }
        else
        {
            throw new InvalidOperationException($"Version de sauvegarde non supportée : {version}.");
        }

        var backup = JsonSerializer.Deserialize<PortalBackup>(json, JsonOptions)
            ?? throw new InvalidOperationException("Contenu de sauvegarde invalide.");

        StorageBootstrap.Save(_env.ContentRootPath, backup.Storage);

        if (string.Equals(backup.Storage.Provider, StorageProvider.SqlServer, StringComparison.OrdinalIgnoreCase))
        {
            var connStr = StorageBootstrap.BuildConnectionString(backup.Storage);
            var logger = _loggerFactory.CreateLogger<SqlConfigRepository>();
            var sqlRepo = new SqlConfigRepository(connStr, logger);
            await sqlRepo.SaveUsersConfigAsync(backup.Users);
            await sqlRepo.SaveFeaturesConfigAsync(backup.Features);
            await sqlRepo.SaveSettingsAsync(backup.Settings);
            await sqlRepo.SaveAuditConfigAsync(backup.Audit ?? new AuditConfig());
            await sqlRepo.SaveAzureAdSecretsAsync(backup.AzureAd ?? new AzureAdSecrets());
        }
        else
        {
            // Toujours écrire dans les fichiers JSON (pas dans _repository qui peut être SQL au démarrage).
            // S'assurer que Config/ et les fichiers existent (après un reset ils peuvent manquer).
            StorageBootstrap.EnsureJsonConfigFiles(_env.ContentRootPath);
            var jsonLogger = _loggerFactory.CreateLogger<JsonConfigRepository>();
            var jsonRepo = new JsonConfigRepository(_env, jsonLogger);
            await jsonRepo.SaveUsersConfigAsync(backup.Users ?? new UsersConfig());
            await jsonRepo.SaveFeaturesConfigAsync(backup.Features ?? new FeaturesConfig());
            await jsonRepo.SaveSettingsAsync(backup.Settings ?? new Settings());
            await jsonRepo.SaveAuditConfigAsync(backup.Audit ?? new AuditConfig());
            await jsonRepo.SaveAzureAdSecretsAsync(backup.AzureAd ?? new AzureAdSecrets());
        }
    }

    private static byte[] EncryptAesCbc(byte[] plainBytes, byte[] key, byte[] iv)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        using var enc = aes.CreateEncryptor();
        return enc.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
    }

    private static byte[] DecryptAesCbc(byte[] ciphertext, byte[] key, byte[] iv)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        using var dec = aes.CreateDecryptor();
        return dec.TransformFinalBlock(ciphertext, 0, ciphertext.Length);
    }
}
