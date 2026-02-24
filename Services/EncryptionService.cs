using System.Security.Cryptography;
using System.Text;

namespace IntuneWksManager.Services;

public interface IEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string encryptedText);
    bool IsEncrypted(string text);
}

/// <summary>
/// Service de chiffrement utilisant AES avec une clé dérivée d'un master key.
/// Le master key est stocké de manière sécurisée via DPAPI (Windows) ou une clé machine.
/// </summary>
public class EncryptionService : IEncryptionService
{
    private readonly byte[] _key;
    private readonly ILogger<EncryptionService> _logger;
    private const string EncryptionPrefix = "ENC:";
    private const int KeySize = 256;
    private const int IvSize = 128;

    public EncryptionService(IConfiguration configuration, IWebHostEnvironment env, ILogger<EncryptionService> logger)
    {
        _logger = logger;
        _key = GetOrCreateMasterKey(env);
    }

    private byte[] GetOrCreateMasterKey(IWebHostEnvironment env)
    {
        var keyPath = Path.Combine(env.ContentRootPath, "Config", ".masterkey");
        var keyDir = Path.GetDirectoryName(keyPath);
        
        if (!Directory.Exists(keyDir))
            Directory.CreateDirectory(keyDir!);

        if (File.Exists(keyPath))
        {
            try
            {
                var encryptedKey = File.ReadAllBytes(keyPath);
                // Déchiffrer avec DPAPI si Windows, sinon utiliser une clé machine
                if (OperatingSystem.IsWindows())
                {
                    return ProtectedData.Unprotect(encryptedKey, null, DataProtectionScope.LocalMachine);
                }
                else
                {
                    // Pour Linux/Mac, utiliser une clé dérivée d'un fichier système
                    var machineKey = GetMachineKey();
                    return DecryptKey(encryptedKey, machineKey);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load master key, creating new one");
            }
        }

        // Créer une nouvelle clé
        var newKey = new byte[KeySize / 8];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(newKey);
        }

        // Chiffrer et sauvegarder
        try
        {
            byte[] encryptedKey;
            if (OperatingSystem.IsWindows())
            {
                encryptedKey = ProtectedData.Protect(newKey, null, DataProtectionScope.LocalMachine);
            }
            else
            {
                var machineKey = GetMachineKey();
                encryptedKey = EncryptKey(newKey, machineKey);
            }
            
            File.WriteAllBytes(keyPath, encryptedKey);
            File.SetAttributes(keyPath, FileAttributes.Hidden | FileAttributes.System);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save master key");
        }

        return newKey;
    }

    private byte[] GetMachineKey()
    {
        // Pour Linux/Mac, utiliser une clé dérivée de l'environnement machine
        var machineId = Environment.MachineName + Environment.OSVersion;
        using var sha256 = SHA256.Create();
        return sha256.ComputeHash(Encoding.UTF8.GetBytes(machineId));
    }

    private byte[] EncryptKey(byte[] key, byte[] machineKey)
    {
        using var aes = Aes.Create();
        aes.Key = machineKey;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        using var ms = new MemoryStream();
        ms.Write(aes.IV, 0, aes.IV.Length);
        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        {
            cs.Write(key, 0, key.Length);
        }
        return ms.ToArray();
    }

    private byte[] DecryptKey(byte[] encryptedKey, byte[] machineKey)
    {
        using var aes = Aes.Create();
        aes.Key = machineKey;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        var iv = new byte[16];
        Array.Copy(encryptedKey, 0, iv, 0, 16);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        using var ms = new MemoryStream(encryptedKey, 16, encryptedKey.Length - 16);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var result = new MemoryStream();
        cs.CopyTo(result);
        return result.ToArray();
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return string.Empty;

        try
        {
            using var aes = Aes.Create();
            aes.Key = _key;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();
            ms.Write(aes.IV, 0, aes.IV.Length);
            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            {
                var plainBytes = Encoding.UTF8.GetBytes(plainText);
                cs.Write(plainBytes, 0, plainBytes.Length);
            }

            var encrypted = ms.ToArray();
            var base64 = Convert.ToBase64String(encrypted);
            return EncryptionPrefix + base64;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Encryption failed");
            throw;
        }
    }

    public string Decrypt(string encryptedText)
    {
        if (string.IsNullOrEmpty(encryptedText))
            return string.Empty;

        if (!IsEncrypted(encryptedText))
            return encryptedText; // Déjà en clair

        try
        {
            var base64 = encryptedText.Substring(EncryptionPrefix.Length);
            var encrypted = Convert.FromBase64String(base64);

            using var aes = Aes.Create();
            aes.Key = _key;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            var iv = new byte[16];
            Array.Copy(encrypted, 0, iv, 0, 16);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            using var ms = new MemoryStream(encrypted, 16, encrypted.Length - 16);
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var result = new MemoryStream();
            cs.CopyTo(result);
            return Encoding.UTF8.GetString(result.ToArray());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Decryption failed");
            throw;
        }
    }

    public bool IsEncrypted(string text)
    {
        return !string.IsNullOrEmpty(text) && text.StartsWith(EncryptionPrefix);
    }
}
