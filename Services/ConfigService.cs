using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

public interface IConfigService
{
    // Users & Admins
    Task<UsersConfig> GetUsersConfigAsync();
    Task SaveUsersConfigAsync(UsersConfig config);
    Task<bool> IsPrimaryAdminAsync(string email);
    Task<bool> IsApprovedSecondaryAdminAsync(string email);
    Task<SecondaryAdmin?> GetSecondaryAdminAsync(string email);
    Task<SecondaryAdmin> CreateSecondaryAdminAsync(SecondaryAdmin admin);
    Task<SecondaryAdmin> UpdateSecondaryAdminAsync(string id, SecondaryAdmin admin);
    Task DeleteSecondaryAdminAsync(string id);
    
    // Access Requests
    Task<AccessRequest> CreateAccessRequestAsync(AccessRequest request);
    Task<AccessRequest> ApproveAccessRequestAsync(string requestId, string approverEmail, string? note);
    Task<AccessRequest> RejectAccessRequestAsync(string requestId, string reviewerEmail, string? note);
    
    // Features
    Task<FeaturesConfig> GetFeaturesConfigAsync();
    Task SaveFeaturesConfigAsync(FeaturesConfig config);
    
    // Settings
    Task<Settings> GetSettingsAsync();
    Task SaveSettingsAsync(Settings settings);
    
    // Audit
    Task<AuditConfig> GetAuditLogsAsync();
    Task AddAuditLogAsync(AuditLog log);
    
    // Azure AD Secrets
    Task<AzureAdSecrets> GetAzureAdSecretsAsync();
    Task SaveAzureAdSecretsAsync(AzureAdSecrets secrets);
}

public class ConfigService : IConfigService
{
    private readonly IConfigRepository _repo;
    private readonly ILogger<ConfigService> _logger;
    private readonly IConfiguration _configuration;
    private static readonly SemaphoreSlim _lock = new(1, 1);

    public ConfigService(IConfigRepository repo, ILogger<ConfigService> logger, IConfiguration configuration)
    {
        _repo = repo;
        _logger = logger;
        _configuration = configuration;
    }

    // ==================== Users & Admins ====================

    public async Task<UsersConfig> GetUsersConfigAsync()
    {
        var config = await _repo.GetUsersConfigAsync();
        // Garantit que les listes ne sont jamais null (ex. désérialisation SQL sans ces clés)
        config.PrimaryAdmins ??= new List<PrimaryAdmin>();
        config.SecondaryAdmins ??= new List<SecondaryAdmin>();
        config.Roles ??= new List<Role>();
        config.AvailablePermissions ??= new List<Permission>();
        config.PendingRequests ??= new List<AccessRequest>();

        // Add primary admin from appsettings if not exists
        var primaryEmail = _configuration["PrimaryAdmin:Email"];
        var primaryDisplayName = _configuration["PrimaryAdmin:DisplayName"];
        if (!string.IsNullOrEmpty(primaryEmail) && 
            !config.PrimaryAdmins.Any(a => a.Email.Equals(primaryEmail, StringComparison.OrdinalIgnoreCase)))
        {
            config.PrimaryAdmins.Add(new PrimaryAdmin
            {
                Id = Guid.NewGuid().ToString(),
                Email = primaryEmail,
                DisplayName = string.IsNullOrEmpty(primaryDisplayName) ? "Administrateur Principal" : primaryDisplayName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        
        return config;
    }

    public async Task SaveUsersConfigAsync(UsersConfig config)
    {
        await _repo.SaveUsersConfigAsync(config);
    }

    public async Task<bool> IsPrimaryAdminAsync(string email)
    {
        if (string.IsNullOrEmpty(email)) return false;
        
        var config = await GetUsersConfigAsync();
        return config.PrimaryAdmins.Any(a => 
            a.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && a.IsActive);
    }

    public async Task<bool> IsApprovedSecondaryAdminAsync(string email)
    {
        if (string.IsNullOrEmpty(email)) return false;
        
        var config = await GetUsersConfigAsync();
        return config.SecondaryAdmins.Any(a => 
            a.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && a.IsActive && a.IsApproved);
    }

    public async Task<SecondaryAdmin?> GetSecondaryAdminAsync(string email)
    {
        var config = await GetUsersConfigAsync();
        return config.SecondaryAdmins.FirstOrDefault(a => 
            a.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<SecondaryAdmin> CreateSecondaryAdminAsync(SecondaryAdmin admin)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await GetUsersConfigAsync();
            admin.Id = Guid.NewGuid().ToString();
            admin.CreatedAt = DateTime.UtcNow;
            config.SecondaryAdmins.Add(admin);
            await SaveUsersConfigAsync(config);
            return admin;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<SecondaryAdmin> UpdateSecondaryAdminAsync(string id, SecondaryAdmin admin)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await GetUsersConfigAsync();
            var index = config.SecondaryAdmins.FindIndex(a => a.Id == id);
            if (index < 0) throw new Exception("Admin not found");
            
            admin.Id = id;
            admin.CreatedAt = config.SecondaryAdmins[index].CreatedAt;
            config.SecondaryAdmins[index] = admin;
            await SaveUsersConfigAsync(config);
            return admin;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task DeleteSecondaryAdminAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await GetUsersConfigAsync();
            config.SecondaryAdmins.RemoveAll(a => a.Id == id);
            await SaveUsersConfigAsync(config);
        }
        finally
        {
            _lock.Release();
        }
    }

    // ==================== Access Requests ====================

    public async Task<AccessRequest> CreateAccessRequestAsync(AccessRequest request)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await GetUsersConfigAsync();
            request.Id = Guid.NewGuid().ToString();
            request.RequestedAt = DateTime.UtcNow;
            request.Status = "Pending";
            config.PendingRequests.Add(request);
            await SaveUsersConfigAsync(config);
            return request;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AccessRequest> ApproveAccessRequestAsync(string requestId, string approverEmail, string? note)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await GetUsersConfigAsync();
            var request = config.PendingRequests.FirstOrDefault(r => r.Id == requestId);
            if (request == null) throw new Exception("Request not found");

            request.Status = "Approved";
            request.ReviewedBy = approverEmail;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewNote = note;

            // Create secondary admin from request
            var newAdmin = new SecondaryAdmin
            {
                Id = Guid.NewGuid().ToString(),
                Email = request.Email,
                DisplayName = request.DisplayName,
                AzureObjectId = request.AzureObjectId,
                Role = request.RequestedRole,
                IsActive = true,
                IsApproved = true,
                ApprovedBy = approverEmail,
                ApprovedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                AllowedFeatures = new List<string>(),
                AllowedActions = new List<string>(),
            };

            // Apply default permissions from role
            var role = config.Roles.FirstOrDefault(r => r.Name == request.RequestedRole);
            if (role != null)
            {
                newAdmin.AllowedActions = new List<string>(role.Permissions);
            }

            config.SecondaryAdmins.Add(newAdmin);
            config.PendingRequests.Remove(request);
            await SaveUsersConfigAsync(config);

            return request;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AccessRequest> RejectAccessRequestAsync(string requestId, string reviewerEmail, string? note)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await GetUsersConfigAsync();
            var request = config.PendingRequests.FirstOrDefault(r => r.Id == requestId);
            if (request == null) throw new Exception("Request not found");

            request.Status = "Rejected";
            request.ReviewedBy = reviewerEmail;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewNote = note;

            config.PendingRequests.Remove(request);
            await SaveUsersConfigAsync(config);

            return request;
        }
        finally
        {
            _lock.Release();
        }
    }

    // ==================== Features ====================

    public async Task<FeaturesConfig> GetFeaturesConfigAsync()
    {
        var config = await _repo.GetFeaturesConfigAsync();
        config.Features ??= new List<Feature>();
        config.Clients ??= new List<Client>();
        return config;
    }
    public Task SaveFeaturesConfigAsync(FeaturesConfig config) => _repo.SaveFeaturesConfigAsync(config);

    // ==================== Settings ====================

    public Task<Settings> GetSettingsAsync() => _repo.GetSettingsAsync();
    public Task SaveSettingsAsync(Settings settings) => _repo.SaveSettingsAsync(settings);

    // ==================== Audit ====================

    public Task<AuditConfig> GetAuditLogsAsync() => _repo.GetAuditConfigAsync();

    public async Task AddAuditLogAsync(AuditLog log)
    {
        await _lock.WaitAsync();
        try
        {
            var config = await _repo.GetAuditConfigAsync();
            config.AuditLogs.Insert(0, log);
            if (config.AuditLogs.Count > 1000)
                config.AuditLogs = config.AuditLogs.Take(1000).ToList();
            await _repo.SaveAuditConfigAsync(config);
        }
        finally
        {
            _lock.Release();
        }
    }

    // ==================== Azure AD Secrets ====================

    public async Task<AzureAdSecrets> GetAzureAdSecretsAsync()
    {
        var secrets = await _repo.GetAzureAdSecretsAsync();
        if (secrets == null || (string.IsNullOrEmpty(secrets.TenantId) && string.IsNullOrEmpty(secrets.ClientId)))
        {
            var tenantId = _configuration["AzureAd:TenantId"];
            var clientId = _configuration["AzureAd:ClientId"];
            var clientSecret = _configuration["AzureAd:ClientSecret"];
            if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
            {
                secrets = new AzureAdSecrets
                {
                    TenantId = tenantId,
                    ClientId = clientId,
                    ClientSecret = clientSecret,
                    LastUpdated = DateTime.UtcNow
                };
            }
            else
            {
                secrets ??= new AzureAdSecrets();
            }
        }
        return secrets;
    }

    public Task SaveAzureAdSecretsAsync(AzureAdSecrets secrets) => _repo.SaveAzureAdSecretsAsync(secrets);
}
