using System.Text.Json;
using Microsoft.Data.SqlClient;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

public class SqlConfigRepository : IConfigRepository
{
    private readonly string _connectionString;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly ILogger<SqlConfigRepository> _logger;
    private const string TableName = "ConfigStore";

    public SqlConfigRepository(string connectionString, ILogger<SqlConfigRepository> logger)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };
        EnsureSchemaAsync().GetAwaiter().GetResult();
    }

    /// <summary>
    /// Crée la table ConfigStore si elle n'existe pas. Utilisé par l'API setup pour initialiser la base.
    /// </summary>
    public static async Task EnsureTablesAsync(string connectionString, ILogger? logger = null)
    {
        const string sql = @"
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConfigStore')
BEGIN
    CREATE TABLE [ConfigStore] (
        [Key] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [Value] NVARCHAR(MAX) NULL,
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
END";
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
        logger?.LogInformation("ConfigStore table ensured.");
    }

    private async Task EnsureSchemaAsync()
    {
        await EnsureTablesAsync(_connectionString, _logger);
    }

    private async Task ExecuteNonQueryAsync(string sql, params SqlParameter[] parameters)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddRange(parameters);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<string?> GetValueAsync(string key)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand($"SELECT [Value] FROM [{TableName}] WHERE [Key] = @Key", conn);
        cmd.Parameters.AddWithValue("@Key", key);
        var o = await cmd.ExecuteScalarAsync();
        return o as string;
    }

    private async Task SetValueAsync(string key, string? value)
    {
        var sql = $@"
MERGE [{TableName}] AS t
USING (SELECT @Key AS [Key], @Value AS [Value]) AS s ON t.[Key] = s.[Key]
WHEN MATCHED THEN UPDATE SET [Value] = s.[Value], [UpdatedAt] = GETUTCDATE()
WHEN NOT MATCHED THEN INSERT ([Key], [Value]) VALUES (s.[Key], s.[Value]);";
        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@Key", key);
        cmd.Parameters.AddWithValue("@Value", (object?)value ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<T> GetAsync<T>(string key) where T : class, new()
    {
        var json = await GetValueAsync(key);
        if (string.IsNullOrEmpty(json)) return new T();
        try
        {
            return JsonSerializer.Deserialize<T>(json, _jsonOptions) ?? new T();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deserializing config key: {Key}", key);
            return new T();
        }
    }

    private async Task SaveAsync<T>(string key, T data)
    {
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        await SetValueAsync(key, json);
    }

    public Task<UsersConfig> GetUsersConfigAsync() => GetAsync<UsersConfig>("Users");
    public Task SaveUsersConfigAsync(UsersConfig config) => SaveAsync("Users", config);

    public Task<FeaturesConfig> GetFeaturesConfigAsync() => GetAsync<FeaturesConfig>("Features");
    public Task SaveFeaturesConfigAsync(FeaturesConfig config) => SaveAsync("Features", config);

    public Task<Settings> GetSettingsAsync() => GetAsync<Settings>("Settings");
    public Task SaveSettingsAsync(Settings settings) => SaveAsync("Settings", settings);

    public Task<AuditConfig> GetAuditConfigAsync() => GetAsync<AuditConfig>("Audit");
    public Task SaveAuditConfigAsync(AuditConfig config) => SaveAsync("Audit", config);

    public Task<AzureAdSecrets> GetAzureAdSecretsAsync() => GetAsync<AzureAdSecrets>("AzureAdSecrets");
    public Task SaveAzureAdSecretsAsync(AzureAdSecrets secrets) => SaveAsync("AzureAdSecrets", secrets);
}
