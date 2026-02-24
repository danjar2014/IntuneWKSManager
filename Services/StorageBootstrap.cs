using System.Text.Json;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

/// <summary>
/// Lecture/écriture du fichier bootstrap Config/storage.json (choix JSON vs SQL).
/// Ce fichier est le seul toujours en fichier pour éviter la circularité.
/// </summary>
public static class StorageBootstrap
{
    private const string FileName = "storage.json";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public static string GetStorageFilePath(string contentRootPath)
    {
        return Path.Combine(contentRootPath, "Config", FileName);
    }

    public static StorageSettings Load(string contentRootPath)
    {
        var path = GetStorageFilePath(contentRootPath);
        if (!File.Exists(path))
            return new StorageSettings { Provider = StorageProvider.Json };

        try
        {
            var json = File.ReadAllText(path);
            var settings = JsonSerializer.Deserialize<StorageSettings>(json, JsonOptions);
            return settings ?? new StorageSettings { Provider = StorageProvider.Json };
        }
        catch
        {
            return new StorageSettings { Provider = StorageProvider.Json };
        }
    }

    public static void Save(string contentRootPath, StorageSettings settings)
    {
        var dir = Path.Combine(contentRootPath, "Config");
        if (!Directory.Exists(dir))
            Directory.CreateDirectory(dir);
        var path = GetStorageFilePath(contentRootPath);
        var json = JsonSerializer.Serialize(settings, JsonOptions);
        File.WriteAllText(path, json);
    }

    /// <summary>
    /// Construit la chaîne de connexion SQL Server à partir des paramètres.
    /// </summary>
    public static string BuildConnectionString(StorageSettings settings)
    {
        if (!string.IsNullOrWhiteSpace(settings.ConnectionString))
            return settings.ConnectionString.Trim();

        var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder
        {
            DataSource = BuildDataSource(settings.Server, settings.Port),
            InitialCatalog = string.IsNullOrWhiteSpace(settings.Database) ? "IntuneWksManager" : settings.Database.Trim(),
            Encrypt = true,
            TrustServerCertificate = true
        };

        if (settings.IntegratedSecurity)
        {
            // Authentification Windows uniquement : identité du processus (sous IIS = identité du pool d'applications).
            builder.IntegratedSecurity = true;
        }
        else
        {
            // Authentification SQL Server : utilisateur et mot de passe.
            if (!string.IsNullOrWhiteSpace(settings.UserId))
            {
                builder.UserID = settings.UserId.Trim();
                builder.Password = settings.Password ?? string.Empty;
            }
        }

        return builder.ConnectionString;
    }

    private static string BuildDataSource(string? server, int? port)
    {
        if (string.IsNullOrWhiteSpace(server))
            return ".";
        server = server.Trim();
        if (port.HasValue && port.Value > 0 && port.Value != 1433)
            return $"{server},{port.Value}";
        return server;
    }

    /// <summary>
    /// Crée le dossier Config et les fichiers JSON par défaut si ils n'existent pas (mode Fichiers JSON).
    /// </summary>
    public static void EnsureJsonConfigFiles(string contentRootPath)
    {
        var dir = Path.Combine(contentRootPath, "Config");
        if (!Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var files = new (string FileName, object DefaultValue)[]
        {
            ("users.json", new UsersConfig()),
            ("features.json", new FeaturesConfig()),
            ("settings.json", new Settings()),
            ("audit.json", new AuditConfig()),
            ("azuread-secrets.json", new AzureAdSecrets())
        };

        foreach (var (fileName, defaultValue) in files)
        {
            var path = Path.Combine(dir, fileName);
            if (File.Exists(path))
                continue;
            var json = JsonSerializer.Serialize(defaultValue, JsonOptions);
            File.WriteAllText(path, json);
        }
    }
}
