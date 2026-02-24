using System.Text.Json;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

public class JsonConfigRepository : IConfigRepository
{
    private readonly string _configPath;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly ILogger<JsonConfigRepository> _logger;

    public JsonConfigRepository(IWebHostEnvironment env, ILogger<JsonConfigRepository> logger)
    {
        _configPath = Path.Combine(env.ContentRootPath, "Config");
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<UsersConfig> GetUsersConfigAsync()
    {
        var path = Path.Combine(_configPath, "users.json");
        return await ReadJsonFileAsync<UsersConfig>(path) ?? new UsersConfig();
    }

    public async Task SaveUsersConfigAsync(UsersConfig config)
    {
        var path = Path.Combine(_configPath, "users.json");
        await WriteJsonFileAsync(path, config);
    }

    public async Task<FeaturesConfig> GetFeaturesConfigAsync()
    {
        var path = Path.Combine(_configPath, "features.json");
        return await ReadJsonFileAsync<FeaturesConfig>(path) ?? new FeaturesConfig();
    }

    public async Task SaveFeaturesConfigAsync(FeaturesConfig config)
    {
        var path = Path.Combine(_configPath, "features.json");
        await WriteJsonFileAsync(path, config);
    }

    public async Task<Settings> GetSettingsAsync()
    {
        var path = Path.Combine(_configPath, "settings.json");
        return await ReadJsonFileAsync<Settings>(path) ?? new Settings();
    }

    public async Task SaveSettingsAsync(Settings settings)
    {
        var path = Path.Combine(_configPath, "settings.json");
        await WriteJsonFileAsync(path, settings);
    }

    public async Task<AuditConfig> GetAuditConfigAsync()
    {
        var path = Path.Combine(_configPath, "audit.json");
        return await ReadJsonFileAsync<AuditConfig>(path) ?? new AuditConfig();
    }

    public async Task SaveAuditConfigAsync(AuditConfig config)
    {
        var path = Path.Combine(_configPath, "audit.json");
        await WriteJsonFileAsync(path, config);
    }

    public async Task<AzureAdSecrets> GetAzureAdSecretsAsync()
    {
        var path = Path.Combine(_configPath, "azuread-secrets.json");
        return await ReadJsonFileAsync<AzureAdSecrets>(path) ?? new AzureAdSecrets();
    }

    public async Task SaveAzureAdSecretsAsync(AzureAdSecrets secrets)
    {
        var path = Path.Combine(_configPath, "azuread-secrets.json");
        await WriteJsonFileAsync(path, secrets);
    }

    private async Task<T?> ReadJsonFileAsync<T>(string path) where T : class
    {
        try
        {
            if (!File.Exists(path))
            {
                _logger.LogWarning("Config file not found: {Path}", path);
                return null;
            }
            var json = await File.ReadAllTextAsync(path);
            return JsonSerializer.Deserialize<T>(json, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading config file: {Path}", path);
            return null;
        }
    }

    private async Task WriteJsonFileAsync<T>(string path, T data)
    {
        try
        {
            var json = JsonSerializer.Serialize(data, _jsonOptions);
            if (File.Exists(path))
            {
                var backupPath = path + ".bak";
                File.Copy(path, backupPath, true);
            }
            await File.WriteAllTextAsync(path, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing config file: {Path}", path);
            throw;
        }
    }
}
