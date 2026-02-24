namespace IntuneWksManager.Models;

// ==================== Admin Models ====================

public class PrimaryAdmin
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string AzureObjectId { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SecondaryAdmin
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string AzureObjectId { get; set; } = string.Empty;
    public string Role { get; set; } = "Viewer";
    public bool IsActive { get; set; } = true;
    public bool IsApproved { get; set; } = false;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLogin { get; set; }
    public List<string> AllowedFeatures { get; set; } = new();
    public List<string> AllowedActions { get; set; } = new();
    public List<string> AllowedDeviceTypes { get; set; } = new();
}

public class AccessRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string AzureObjectId { get; set; } = string.Empty;
    public string RequestedRole { get; set; } = "Viewer";
    public string? Message { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
}

public class Role
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
}

public class Permission
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class UsersConfig
{
    public List<PrimaryAdmin> PrimaryAdmins { get; set; } = new();
    public List<SecondaryAdmin> SecondaryAdmins { get; set; } = new();
    public List<Role> Roles { get; set; } = new();
    public List<Permission> AvailablePermissions { get; set; } = new();
    public List<AccessRequest> PendingRequests { get; set; } = new();
}

// ==================== Current User Context ====================

public class CurrentUser
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string AzureObjectId { get; set; } = string.Empty;
    public bool IsPrimaryAdmin { get; set; }
    public bool IsSecondaryAdmin { get; set; }
    public bool IsApproved { get; set; }
    public string Role { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public List<string> AllowedFeatures { get; set; } = new();
    public List<string> AllowedActions { get; set; } = new();
    public List<string> AllowedDeviceTypes { get; set; } = new();
}

// ==================== Feature Models ====================

public class Feature
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string RequiredPermission { get; set; } = string.Empty;
    public List<SubFeature> SubFeatures { get; set; } = new();
}

public class SubFeature
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string RequiredPermission { get; set; } = string.Empty;
}

public class Client
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<string> EnabledFeatures { get; set; } = new();
    public List<string> DisabledSubFeatures { get; set; } = new();
}

public class FeaturesConfig
{
    public List<Feature> Features { get; set; } = new();
    public List<Client> Clients { get; set; } = new();
}

// ==================== Settings Models ====================

public class PortalTheme
{
    public string PrimaryColor { get; set; } = "#0078d4";
    public string SecondaryColor { get; set; } = "#106ebe";
    public string AccentColor { get; set; } = "#00bcf2";
    public bool DarkMode { get; set; }
    public string CustomCss { get; set; } = string.Empty;
}

public class PortalSettings
{
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Logo { get; set; } = string.Empty;
    /// <summary>Favicon path or URL (e.g. /favicon.ico).</summary>
    public string Favicon { get; set; } = string.Empty;
    public PortalTheme Theme { get; set; } = new();
    public int SessionTimeout { get; set; }
    public int MaxLoginAttempts { get; set; }
    public int LockoutDuration { get; set; }
    public bool EnableAuditLog { get; set; }
    public string DefaultLanguage { get; set; } = "fr-FR";
    public bool AllowSelfRegistration { get; set; } = false;
    public bool RequireApproval { get; set; } = true;
}

public class GraphApiSettings
{
    public string BaseUrl { get; set; } = string.Empty;
    public string BetaUrl { get; set; } = string.Empty;
    public List<string> Scopes { get; set; } = new();
    public int RequestTimeout { get; set; }
    public int MaxRetries { get; set; }
    public bool UseBetaEndpoint { get; set; }
}

public class NotificationSettings
{
    public bool EnableEmail { get; set; }
    public string SmtpServer { get; set; } = string.Empty;
    public int SmtpPort { get; set; }
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public List<string> AdminEmails { get; set; } = new();
}

public class MaintenanceSettings
{
    public bool IsEnabled { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool AllowAdminAccess { get; set; }
}

public class Settings
{
    public PortalSettings Portal { get; set; } = new();
    public GraphApiSettings GraphApi { get; set; } = new();
    public NotificationSettings Notifications { get; set; } = new();
    public MaintenanceSettings Maintenance { get; set; } = new();
}

// ==================== Audit Models ====================

public class AuditLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string UserEmail { get; set; } = string.Empty;
    public string UserType { get; set; } = string.Empty; // PrimaryAdmin, SecondaryAdmin
    public string Action { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public bool Success { get; set; }
}

public class AuditConfig
{
    public List<AuditLog> AuditLogs { get; set; } = new();
}

// ==================== Graph API Response Models ====================

public class DeviceInfo
{
    public string Id { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public string UserPrincipalName { get; set; } = string.Empty;
    public string OperatingSystem { get; set; } = string.Empty;
    public string OsVersion { get; set; } = string.Empty;
    public string ComplianceState { get; set; } = string.Empty;
    public DateTime? LastSyncDateTime { get; set; }
    public string ManagementState { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Manufacturer { get; set; } = string.Empty;
}

public class IntuneUser
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string UserPrincipalName { get; set; } = string.Empty;
    public string Mail { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public int DeviceCount { get; set; }
}

public class IntuneApp
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public string AppType { get; set; } = string.Empty;
    public DateTime? CreatedDateTime { get; set; }
    public DateTime? LastModifiedDateTime { get; set; }
    public bool IsFeatured { get; set; }
}

// ==================== API Response Models ====================

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
}

public class LoginResponse
{
    public bool IsAuthenticated { get; set; }
    public bool IsAuthorized { get; set; }
    public bool NeedsApproval { get; set; }
    public CurrentUser? User { get; set; }
    public string? RedirectUrl { get; set; }
}

// ==================== Azure AD Secrets Model ====================

public class AzureAdSecrets
{
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty; // Chiffré
    public DateTime? LastUpdated { get; set; }
    public string? UpdatedBy { get; set; }
}

// ==================== Sauvegarde / Restauration ====================

/// <summary>
/// Contenu d'une sauvegarde chiffrée du portail (stockage + toute la config).
/// </summary>
public class PortalBackup
{
    public const int FormatVersion = 1;
    public int Version { get; set; } = FormatVersion;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public StorageSettings Storage { get; set; } = new();
    public UsersConfig Users { get; set; } = new();
    public FeaturesConfig Features { get; set; } = new();
    public Settings Settings { get; set; } = new();
    public AuditConfig Audit { get; set; } = new();
    public AzureAdSecrets AzureAd { get; set; } = new();
}

// ==================== Stockage (bootstrap) ====================

public static class StorageProvider
{
    public const string Json = "Json";
    public const string SqlServer = "SqlServer";
}

public class StorageSettings
{
    public string Provider { get; set; } = StorageProvider.Json;
    public string? ConnectionString { get; set; }
    public string? Server { get; set; }
    public int? Port { get; set; }
    public string? Database { get; set; }
    public string? UserId { get; set; }
    public string? Password { get; set; }
    public bool IntegratedSecurity { get; set; }
}
