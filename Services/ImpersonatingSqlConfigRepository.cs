using System.Runtime.Versioning;
using System.Security.Principal;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

/// <summary>
/// Exécute toutes les opérations SQL sous l'identité Windows de l'utilisateur connecté (session),
/// au lieu du compte du pool IIS. Requiert que l'authentification Negotiate ait fourni une WindowsIdentity (HttpContext.Items["WindowsIdentity"]).
/// </summary>
[SupportedOSPlatform("windows")]
public class ImpersonatingSqlConfigRepository : IConfigRepository
{
    private readonly string _connectionString;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILoggerFactory _loggerFactory;
    private const string WindowsIdentityKey = "WindowsIdentity";

    public ImpersonatingSqlConfigRepository(
        string connectionString,
        IHttpContextAccessor httpContextAccessor,
        ILoggerFactory loggerFactory)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
        _loggerFactory = loggerFactory ?? throw new ArgumentNullException(nameof(loggerFactory));
    }

    /// <summary>
    /// Clé utilisée par le middleware pour stocker l'identité Windows dans HttpContext.Items.
    /// </summary>
    public static string IdentityKey => WindowsIdentityKey;

    private WindowsIdentity? GetWindowsIdentity()
    {
        var context = _httpContextAccessor.HttpContext;
        if (context?.Items.TryGetValue(WindowsIdentityKey, out var obj) == true && obj is WindowsIdentity wi)
            return wi;
        return null;
    }

    private async Task<T> RunUnderUserIdentityAsync<T>(Func<Task<T>> operation)
    {
        var wi = GetWindowsIdentity();
        if (wi == null)
        {
            _loggerFactory.CreateLogger<ImpersonatingSqlConfigRepository>()
                .LogWarning("No Windows identity available for SQL connection; ensure Windows Authentication is enabled in IIS.");
            throw new InvalidOperationException(
                "Aucune identité Windows disponible pour la connexion SQL. Activez l'authentification Windows dans IIS pour cette application et assurez-vous que le navigateur envoie les informations d'identification.");
        }

        // RunImpersonated n'a pas de surcharge async ; on exécute l'opération dans un thread sous identité utilisateur
        return await Task.Run(() =>
            WindowsIdentity.RunImpersonated(wi.AccessToken, () => operation().GetAwaiter().GetResult()));
    }

    private Task RunUnderUserIdentityAsync(Func<Task> operation) =>
        RunUnderUserIdentityAsync<bool>(async () => { await operation(); return true; });

    private ILogger<SqlConfigRepository> SqlLogger => _loggerFactory.CreateLogger<SqlConfigRepository>();

    public Task<UsersConfig> GetUsersConfigAsync() =>
        RunUnderUserIdentityAsync<UsersConfig>(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.GetUsersConfigAsync();
        });

    public Task SaveUsersConfigAsync(UsersConfig config) =>
        RunUnderUserIdentityAsync(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.SaveUsersConfigAsync(config);
        });

    public Task<FeaturesConfig> GetFeaturesConfigAsync() =>
        RunUnderUserIdentityAsync<FeaturesConfig>(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.GetFeaturesConfigAsync();
        });

    public Task SaveFeaturesConfigAsync(FeaturesConfig config) =>
        RunUnderUserIdentityAsync(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.SaveFeaturesConfigAsync(config);
        });

    public Task<Settings> GetSettingsAsync() =>
        RunUnderUserIdentityAsync<Settings>(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.GetSettingsAsync();
        });

    public Task SaveSettingsAsync(Settings settings) =>
        RunUnderUserIdentityAsync(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.SaveSettingsAsync(settings);
        });

    public Task<AuditConfig> GetAuditConfigAsync() =>
        RunUnderUserIdentityAsync<AuditConfig>(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.GetAuditConfigAsync();
        });

    public Task SaveAuditConfigAsync(AuditConfig config) =>
        RunUnderUserIdentityAsync(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.SaveAuditConfigAsync(config);
        });

    public Task<AzureAdSecrets> GetAzureAdSecretsAsync() =>
        RunUnderUserIdentityAsync<AzureAdSecrets>(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.GetAzureAdSecretsAsync();
        });

    public Task SaveAzureAdSecretsAsync(AzureAdSecrets secrets) =>
        RunUnderUserIdentityAsync(() =>
        {
            var repo = new SqlConfigRepository(_connectionString, SqlLogger);
            return repo.SaveAzureAdSecretsAsync(secrets);
        });
}
