using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

/// <summary>
/// Abstraction de persistance pour la configuration (fichiers JSON ou base SQL).
/// </summary>
public interface IConfigRepository
{
    Task<UsersConfig> GetUsersConfigAsync();
    Task SaveUsersConfigAsync(UsersConfig config);

    Task<FeaturesConfig> GetFeaturesConfigAsync();
    Task SaveFeaturesConfigAsync(FeaturesConfig config);

    Task<Settings> GetSettingsAsync();
    Task SaveSettingsAsync(Settings settings);

    Task<AuditConfig> GetAuditConfigAsync();
    Task SaveAuditConfigAsync(AuditConfig config);

    Task<AzureAdSecrets> GetAzureAdSecretsAsync();
    Task SaveAzureAdSecretsAsync(AzureAdSecrets secrets);
}
