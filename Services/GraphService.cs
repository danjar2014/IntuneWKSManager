using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.DeviceManagement.ManagedDevices.Item.Wipe;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

public interface IGraphService
{
    /// <summary>Réinitialise le client Graph à partir de la config Azure AD (à appeler après restauration de sauvegarde ou changement de config).</summary>
    Task ReinitializeClientAsync();
    Task<bool> TestConnectionAsync();
    Task<List<DeviceInfo>> GetManagedDevicesAsync();
    Task<DeviceInfo?> GetDeviceAsync(string deviceId);
    Task<bool> SyncDeviceAsync(string deviceId);
    Task<bool> RestartDeviceAsync(string deviceId);
    Task<bool> WipeDeviceAsync(string deviceId);
    Task<bool> RetireDeviceAsync(string deviceId);
    Task<bool> SetPrimaryUserAsync(string deviceId, string userId);
    Task<List<IntuneUser>> GetUsersAsync();
    Task<List<IntuneUser>> SearchUsersAsync(string search, int maxResults = 20);
    Task<List<DeviceInfo>> GetUserDevicesAsync(string userId);
    Task<List<IntuneApp>> GetAppsAsync();
    Task<object> GetCompliancePoliciesAsync();
    Task<object> GetConfigurationProfilesAsync();
}

public class GraphService : IGraphService
{
    private const string GraphBase = "https://graph.microsoft.com/beta";
    private readonly IConfiguration _configuration;
    private readonly ILogger<GraphService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfigService _configService;
    private readonly IEncryptionService _encryptionService;
    private GraphServiceClient? _graphClient;
    private ClientSecretCredential? _credential;

    public GraphService(
        IConfiguration configuration, 
        ILogger<GraphService> logger, 
        IHttpClientFactory httpClientFactory,
        IConfigService configService,
        IEncryptionService encryptionService)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configService = configService;
        _encryptionService = encryptionService;
        _ = InitializeClientAsync();
    }

    private async Task InitializeClientAsync()
    {
        try
        {
            // Essayer d'abord de charger depuis les secrets chiffrés
            var secrets = await _configService.GetAzureAdSecretsAsync();
            string? tenantId = null;
            string? clientId = null;
            string? clientSecret = null;

            if (!string.IsNullOrEmpty(secrets.TenantId) && !string.IsNullOrEmpty(secrets.ClientId) && !string.IsNullOrEmpty(secrets.ClientSecret))
            {
                tenantId = secrets.TenantId;
                clientId = secrets.ClientId;
                // Déchiffrer le secret
                clientSecret = _encryptionService.Decrypt(secrets.ClientSecret);
            }
            else
            {
                // Fallback vers appsettings.json (pour migration)
                tenantId = _configuration["AzureAd:TenantId"];
                clientId = _configuration["AzureAd:ClientId"];
                clientSecret = _configuration["AzureAd:ClientSecret"];
            }

            if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                _logger.LogWarning("Azure AD credentials not configured");
                return;
            }

            _credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            _graphClient = new GraphServiceClient(_credential);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Graph client");
        }
    }

    public async Task ReinitializeClientAsync()
    {
        await InitializeClientAsync();
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            if (_graphClient == null) return false;
            
            var org = await _graphClient.Organization.GetAsync();
            return org?.Value?.Any() == true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Graph API connection test failed");
            return false;
        }
    }

    public async Task<List<DeviceInfo>> GetManagedDevicesAsync()
    {
        var devices = new List<DeviceInfo>();
        
        try
        {
            if (_graphClient == null) return devices;

            var result = await _graphClient.DeviceManagement.ManagedDevices.GetAsync(config =>
            {
                config.QueryParameters.Top = 100;
                config.QueryParameters.Select = new[]
                {
                    "id", "deviceName", "userPrincipalName", "operatingSystem",
                    "osVersion", "complianceState", "lastSyncDateTime",
                    "managedDeviceOwnerType", "serialNumber", "model", "manufacturer"
                };
            });

            if (result?.Value != null)
            {
                devices = result.Value.Select(d => MapToDeviceInfo(d)).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get managed devices");
        }

        return devices;
    }

    private DeviceInfo MapToDeviceInfo(ManagedDevice d)
    {
        return new DeviceInfo
        {
            Id = d.Id ?? string.Empty,
            DeviceName = d.DeviceName ?? string.Empty,
            UserPrincipalName = d.UserPrincipalName ?? string.Empty,
            OperatingSystem = d.OperatingSystem ?? string.Empty,
            OsVersion = d.OsVersion ?? string.Empty,
            ComplianceState = d.ComplianceState?.ToString() ?? string.Empty,
            LastSyncDateTime = d.LastSyncDateTime?.DateTime,
            ManagementState = d.ManagedDeviceOwnerType?.ToString() ?? string.Empty,
            SerialNumber = d.SerialNumber ?? string.Empty,
            Model = d.Model ?? string.Empty,
            Manufacturer = d.Manufacturer ?? string.Empty
        };
    }

    public async Task<DeviceInfo?> GetDeviceAsync(string deviceId)
    {
        try
        {
            if (_graphClient == null) return null;

            var device = await _graphClient.DeviceManagement.ManagedDevices[deviceId].GetAsync();
            
            if (device == null) return null;

            return MapToDeviceInfo(device);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get device {DeviceId}", deviceId);
            return null;
        }
    }

    public async Task<bool> SyncDeviceAsync(string deviceId)
    {
        try
        {
            if (_graphClient == null) return false;
            
            await _graphClient.DeviceManagement.ManagedDevices[deviceId].SyncDevice.PostAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync device {DeviceId}", deviceId);
            return false;
        }
    }

    public async Task<bool> RestartDeviceAsync(string deviceId)
    {
        try
        {
            if (_graphClient == null) return false;
            
            await _graphClient.DeviceManagement.ManagedDevices[deviceId].RebootNow.PostAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restart device {DeviceId}", deviceId);
            return false;
        }
    }

    public async Task<bool> WipeDeviceAsync(string deviceId)
    {
        try
        {
            if (_graphClient == null) return false;
            
            var wipeRequest = new WipePostRequestBody
            {
                KeepEnrollmentData = false,
                KeepUserData = false
            };
            
            await _graphClient.DeviceManagement.ManagedDevices[deviceId].Wipe.PostAsync(wipeRequest);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to wipe device {DeviceId}", deviceId);
            return false;
        }
    }

    public async Task<bool> RetireDeviceAsync(string deviceId)
    {
        try
        {
            if (_graphClient == null) return false;
            
            await _graphClient.DeviceManagement.ManagedDevices[deviceId].Retire.PostAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retire device {DeviceId}", deviceId);
            return false;
        }
    }

    public async Task<bool> SetPrimaryUserAsync(string deviceId, string userId)
    {
        if (_credential == null || string.IsNullOrEmpty(deviceId) || string.IsNullOrEmpty(userId))
            return false;

        try
        {
            var token = await _credential.GetTokenAsync(new TokenRequestContext(new[] { "https://graph.microsoft.com/.default" }));
            var url = $"{GraphBase}/deviceManagement/managedDevices('{deviceId}')/users/$ref";
            var payload = new Dictionary<string, string> { ["@odata.id"] = $"{GraphBase}/users/{userId}" };
            var json = JsonSerializer.Serialize(payload);

            using var http = _httpClientFactory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var res = await http.SendAsync(req);
            if (res.IsSuccessStatusCode)
                return true;
            var err = await res.Content.ReadAsStringAsync();
            _logger.LogWarning("SetPrimaryUser failed {StatusCode}: {Response}", res.StatusCode, err);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set primary user for device {DeviceId}", deviceId);
            return false;
        }
    }

    public async Task<List<IntuneUser>> GetUsersAsync()
    {
        var users = new List<IntuneUser>();
        
        try
        {
            if (_graphClient == null) return users;

            var result = await _graphClient.Users.GetAsync(config =>
            {
                config.QueryParameters.Top = 100;
                config.QueryParameters.Select = new[]
                {
                    "id", "displayName", "userPrincipalName", "mail", "jobTitle", "department"
                };
            });

            if (result?.Value != null)
            {
                users = result.Value.Select(u => new IntuneUser
                {
                    Id = u.Id ?? string.Empty,
                    DisplayName = u.DisplayName ?? string.Empty,
                    UserPrincipalName = u.UserPrincipalName ?? string.Empty,
                    Mail = u.Mail ?? string.Empty,
                    JobTitle = u.JobTitle ?? string.Empty,
                    Department = u.Department ?? string.Empty
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get users");
        }

        return users;
    }

    public async Task<List<IntuneUser>> SearchUsersAsync(string search, int maxResults = 20)
    {
        var users = new List<IntuneUser>();
        if (string.IsNullOrWhiteSpace(search) || search.Length < 2) return users;

        try
        {
            if (_graphClient == null) return users;

            var escaped = search.Trim().Replace("'", "''");
            var filter = $"startswith(displayName,'{escaped}') or startswith(mail,'{escaped}') or startswith(userPrincipalName,'{escaped}')";

            var result = await _graphClient.Users.GetAsync(config =>
            {
                config.QueryParameters.Top = maxResults;
                config.QueryParameters.Filter = filter;
                config.QueryParameters.Orderby = new[] { "displayName" };
                config.QueryParameters.Select = new[] { "id", "displayName", "userPrincipalName", "mail" };
                config.QueryParameters.Count = true;
                config.Headers.Add("ConsistencyLevel", "eventual");
            });

            if (result?.Value != null)
            {
                users = result.Value.Select(u => new IntuneUser
                {
                    Id = u.Id ?? string.Empty,
                    DisplayName = u.DisplayName ?? string.Empty,
                    UserPrincipalName = u.UserPrincipalName ?? string.Empty,
                    Mail = u.Mail ?? u.UserPrincipalName ?? string.Empty,
                    JobTitle = string.Empty,
                    Department = string.Empty
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SearchUsers failed for query {Query}", search);
        }

        return users;
    }

    public async Task<List<DeviceInfo>> GetUserDevicesAsync(string userId)
    {
        var devices = new List<DeviceInfo>();
        
        try
        {
            if (_graphClient == null) return devices;

            var allDevices = await GetManagedDevicesAsync();
            var user = await _graphClient.Users[userId].GetAsync(config =>
            {
                config.QueryParameters.Select = new[] { "userPrincipalName" };
            });

            if (user?.UserPrincipalName != null)
            {
                devices = allDevices.Where(d => 
                    d.UserPrincipalName.Equals(user.UserPrincipalName, StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get devices for user {UserId}", userId);
        }

        return devices;
    }

    public async Task<List<IntuneApp>> GetAppsAsync()
    {
        var apps = new List<IntuneApp>();
        
        try
        {
            if (_graphClient == null) return apps;

            var result = await _graphClient.DeviceAppManagement.MobileApps.GetAsync(config =>
            {
                config.QueryParameters.Top = 100;
            });

            if (result?.Value != null)
            {
                apps = result.Value.Select(a => new IntuneApp
                {
                    Id = a.Id ?? string.Empty,
                    DisplayName = a.DisplayName ?? string.Empty,
                    Publisher = a.Publisher ?? string.Empty,
                    AppType = a.OdataType ?? string.Empty,
                    CreatedDateTime = a.CreatedDateTime?.DateTime,
                    LastModifiedDateTime = a.LastModifiedDateTime?.DateTime,
                    IsFeatured = a.IsFeatured ?? false
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get apps");
        }

        return apps;
    }

    public async Task<object> GetCompliancePoliciesAsync()
    {
        try
        {
            if (_graphClient == null) return new List<object>();

            var result = await _graphClient.DeviceManagement.DeviceCompliancePolicies.GetAsync();
            
            if (result?.Value != null)
            {
                return result.Value.Select(p => new
                {
                    Id = p.Id,
                    DisplayName = p.DisplayName,
                    Description = p.Description,
                    CreatedDateTime = p.CreatedDateTime,
                    LastModifiedDateTime = p.LastModifiedDateTime
                }).ToList();
            }
            
            return new List<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get compliance policies");
            return new List<object>();
        }
    }

    public async Task<object> GetConfigurationProfilesAsync()
    {
        try
        {
            if (_graphClient == null) return new List<object>();

            var result = await _graphClient.DeviceManagement.DeviceConfigurations.GetAsync();
            
            if (result?.Value != null)
            {
                return result.Value.Select(c => new
                {
                    Id = c.Id,
                    DisplayName = c.DisplayName,
                    Description = c.Description,
                    CreatedDateTime = c.CreatedDateTime,
                    LastModifiedDateTime = c.LastModifiedDateTime
                }).ToList();
            }
            
            return new List<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get configuration profiles");
            return new List<object>();
        }
    }
}
