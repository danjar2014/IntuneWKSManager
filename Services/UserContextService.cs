using System.Security.Claims;
using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

public interface IUserContextService
{
    Task<CurrentUser?> GetCurrentUserAsync();
    Task<bool> HasPermissionAsync(string permission);
    Task<bool> HasFeatureAccessAsync(string featureId);
    Task<bool> HasClientAccessAsync(string clientId);
    Task<bool> CanPerformActionAsync(string action);
}

public class UserContextService : IUserContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IConfigService _configService;
    private CurrentUser? _cachedUser;

    public UserContextService(IHttpContextAccessor httpContextAccessor, IConfigService configService)
    {
        _httpContextAccessor = httpContextAccessor;
        _configService = configService;
    }

    public async Task<CurrentUser?> GetCurrentUserAsync()
    {
        if (_cachedUser != null) return _cachedUser;

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated != true)
            return null;

        var email = httpContext.User.FindFirst("preferred_username")?.Value
                 ?? httpContext.User.FindFirst("email")?.Value
                 ?? httpContext.User.FindFirst(ClaimTypes.Email)?.Value;

        var displayName = httpContext.User.FindFirst("name")?.Value
                       ?? httpContext.User.FindFirst(ClaimTypes.Name)?.Value
                       ?? email;

        var objectId = httpContext.User.FindFirst("oid")?.Value
                    ?? httpContext.User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
                    ?? "";

        if (string.IsNullOrEmpty(email)) return null;

        var config = await _configService.GetUsersConfigAsync();

        // Check if Primary Admin
        var primaryAdmin = config.PrimaryAdmins.FirstOrDefault(a => 
            a.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && a.IsActive);

        if (primaryAdmin != null)
        {
            _cachedUser = new CurrentUser
            {
                Id = primaryAdmin.Id,
                Email = primaryAdmin.Email,
                DisplayName = !string.IsNullOrWhiteSpace(displayName) ? displayName : (primaryAdmin.DisplayName ?? email),
                AzureObjectId = objectId,
                IsPrimaryAdmin = true,
                IsSecondaryAdmin = false,
                IsApproved = true,
                Role = "PrimaryAdmin",
                Permissions = new List<string> { "*" },
                AllowedFeatures = new List<string> { "*" },
                AllowedActions = new List<string> { "*" },
                AllowedDeviceTypes = new List<string> { "*" }
            };
            return _cachedUser;
        }

        // Check if Secondary Admin
        var secondaryAdmin = config.SecondaryAdmins.FirstOrDefault(a => 
            a.Email.Equals(email, StringComparison.OrdinalIgnoreCase));

        if (secondaryAdmin != null)
        {
            var role = config.Roles.FirstOrDefault(r => r.Name == secondaryAdmin.Role);
            
            _cachedUser = new CurrentUser
            {
                Id = secondaryAdmin.Id,
                Email = secondaryAdmin.Email,
                DisplayName = !string.IsNullOrWhiteSpace(secondaryAdmin.DisplayName) ? secondaryAdmin.DisplayName : (displayName ?? secondaryAdmin.Email),
                AzureObjectId = objectId,
                IsPrimaryAdmin = false,
                IsSecondaryAdmin = true,
                IsApproved = secondaryAdmin.IsApproved && secondaryAdmin.IsActive,
                Role = secondaryAdmin.Role,
                Permissions = role?.Permissions ?? new List<string>(),
                AllowedFeatures = secondaryAdmin.AllowedFeatures,
                AllowedActions = secondaryAdmin.AllowedActions,
                AllowedDeviceTypes = secondaryAdmin.AllowedDeviceTypes ?? new List<string>()
            };
            return _cachedUser;
        }

        // New user - not yet registered
        _cachedUser = new CurrentUser
        {
            Id = "",
            Email = email ?? "",
            DisplayName = displayName ?? "",
            AzureObjectId = objectId,
            IsPrimaryAdmin = false,
            IsSecondaryAdmin = false,
            IsApproved = false,
            Role = "",
            Permissions = new List<string>(),
            AllowedFeatures = new List<string>(),
            AllowedActions = new List<string>(),
            AllowedDeviceTypes = new List<string>()
        };

        return _cachedUser;
    }

    public async Task<bool> HasPermissionAsync(string permission)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return false;
        if (user.IsPrimaryAdmin) return true;
        if (!user.IsApproved) return false;
        // Rôle Custom n'a pas de Permissions; on utilise AllowedActions (devices.read, users.read, apps.read, etc.)
        return user.Permissions.Contains("*") || user.Permissions.Contains(permission)
            || user.AllowedActions.Contains("*") || user.AllowedActions.Contains(permission);
    }

    public async Task<bool> HasFeatureAccessAsync(string featureId)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return false;
        if (user.IsPrimaryAdmin) return true;
        if (!user.IsApproved) return false;
        
        return user.AllowedFeatures.Contains("*") || user.AllowedFeatures.Contains(featureId);
    }

    public async Task<bool> HasClientAccessAsync(string clientId)
    {
        // Single tenant - always return true for approved users
        var user = await GetCurrentUserAsync();
        if (user == null) return false;
        if (user.IsPrimaryAdmin) return true;
        return user.IsApproved;
    }

    public async Task<bool> CanPerformActionAsync(string action)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return false;
        if (user.IsPrimaryAdmin) return true;
        if (!user.IsApproved) return false;
        
        return user.AllowedActions.Contains("*") || user.AllowedActions.Contains(action);
    }
}
