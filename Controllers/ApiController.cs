using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IntuneWksManager.Models;
using IntuneWksManager.Services;

namespace IntuneWksManager.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ApiController : ControllerBase
{
    private readonly IConfigService _configService;
    private readonly IGraphService _graphService;
    private readonly IUserContextService _userContext;
    private readonly ILogger<ApiController> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly StorageSettings _storageSettings;
    private readonly IBackupRestoreService _backupRestore;

    public ApiController(
        IConfigService configService,
        IGraphService graphService,
        IUserContextService userContext,
        ILogger<ApiController> logger,
        IWebHostEnvironment env,
        StorageSettings storageSettings,
        IBackupRestoreService backupRestore)
    {
        _configService = configService;
        _graphService = graphService;
        _userContext = userContext;
        _logger = logger;
        _env = env;
        _storageSettings = storageSettings;
        _backupRestore = backupRestore;
    }

    private static bool IsEnglish(string? lang)
    {
        if (string.IsNullOrWhiteSpace(lang)) return false;
        var v = lang.Trim().ToLowerInvariant();
        return v == "en" || v.StartsWith("en-", StringComparison.Ordinal);
    }

    private string GetRequestLanguage(string? bodyLang = null)
    {
        if (IsEnglish(bodyLang)) return "en";
        var q = Request.Query["lang"].FirstOrDefault();
        if (IsEnglish(q)) return "en";
        var accept = Request.Headers["Accept-Language"].ToString();
        if (!string.IsNullOrEmpty(accept) && accept.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return "en";
        return "fr";
    }

    // ==================== Auth & Current User ====================

    [HttpGet("auth/me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user == null)
            return Unauthorized(new { message = "Non authentifié" });

        return Ok(user);
    }

    [HttpGet("auth/status")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAuthStatus()
    {
        var user = await _userContext.GetCurrentUserAsync();
        
        return Ok(new LoginResponse
        {
            IsAuthenticated = user != null,
            IsAuthorized = user?.IsPrimaryAdmin == true || user?.IsApproved == true,
            NeedsApproval = user != null && !user.IsPrimaryAdmin && !user.IsApproved,
            User = user,
            RedirectUrl = user?.IsPrimaryAdmin == true ? "/admin" : "/operator"
        });
    }

    /// <summary>Vérifie si le stockage actuel (SQL ou JSON) est accessible. Utilisé pour le témoin vert/rouge. ?lang=en pour libellés en anglais.</summary>
    [HttpGet("storage/status")]
    public async Task<IActionResult> GetStorageStatus([FromQuery] string? lang = null)
    {
        var isSql = string.Equals(_storageSettings.Provider, StorageProvider.SqlServer, StringComparison.OrdinalIgnoreCase);
        var mode = isSql ? "SqlServer" : "Json";
        var en = GetRequestLanguage(lang) == "en";
        var modeLabel = isSql ? (en ? "SQL Server" : "SQL Server") : (en ? "JSON files" : "Fichiers JSON");
        try
        {
            _ = await _configService.GetSettingsAsync();
            return Ok(new { connected = true, mode, modeLabel });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Storage status check failed");
            return Ok(new { connected = false, mode, modeLabel, message = ex.Message });
        }
    }

    // ==================== Access Requests ====================

    [HttpPost("access/request")]
    public async Task<IActionResult> RequestAccess([FromBody] AccessRequest request)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        // Check if already registered
        if (user.IsPrimaryAdmin || user.IsSecondaryAdmin)
            return BadRequest(new { message = "Vous êtes déjà enregistré" });

        request.Email = user.Email;
        request.DisplayName = user.DisplayName;
        request.AzureObjectId = user.AzureObjectId;

        var created = await _configService.CreateAccessRequestAsync(request);
        await LogAudit("ACCESS_REQUEST", "AccessRequest", $"Demande d'accès de {user.Email}");
        
        return Ok(created);
    }

    [HttpGet("access/requests")]
    public async Task<IActionResult> GetAccessRequests()
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetUsersConfigAsync();
        return Ok(config.PendingRequests);
    }

    [HttpPost("access/requests/{id}/approve")]
    public async Task<IActionResult> ApproveRequest(string id, [FromBody] ReviewRequest review)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var request = await _configService.ApproveAccessRequestAsync(id, user.Email, review.Note);
        await LogAudit("APPROVE_ACCESS", "AccessRequest", $"Approuvé: {request.Email}");
        
        return Ok(request);
    }

    [HttpPost("access/requests/{id}/reject")]
    public async Task<IActionResult> RejectRequest(string id, [FromBody] ReviewRequest review)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var request = await _configService.RejectAccessRequestAsync(id, user.Email, review.Note);
        await LogAudit("REJECT_ACCESS", "AccessRequest", $"Rejeté: {request.Email}");
        
        return Ok(request);
    }

    // ==================== Secondary Admins Management ====================

    [HttpGet("admins")]
    public async Task<IActionResult> GetSecondaryAdmins()
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetUsersConfigAsync();
        return Ok(config.SecondaryAdmins);
    }

    [HttpGet("admins/{id}")]
    public async Task<IActionResult> GetSecondaryAdmin(string id)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetUsersConfigAsync();
        var admin = config.SecondaryAdmins.FirstOrDefault(a => a.Id == id);
        return admin != null ? Ok(admin) : NotFound();
    }

    [HttpPost("admins")]
    public async Task<IActionResult> CreateSecondaryAdmin([FromBody] SecondaryAdmin admin)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        admin.ApprovedBy = user.Email;
        admin.ApprovedAt = DateTime.UtcNow;
        admin.IsApproved = true;

        var created = await _configService.CreateSecondaryAdminAsync(admin);
        await LogAudit("CREATE_ADMIN", "SecondaryAdmin", $"Créé: {admin.Email}");
        
        return Ok(created);
    }

    [HttpPut("admins/{id}")]
    public async Task<IActionResult> UpdateSecondaryAdmin(string id, [FromBody] SecondaryAdmin admin)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var updated = await _configService.UpdateSecondaryAdminAsync(id, admin);
        await LogAudit("UPDATE_ADMIN", "SecondaryAdmin", $"Modifié: {admin.Email}");
        
        return Ok(updated);
    }

    [HttpDelete("admins/{id}")]
    public async Task<IActionResult> DeleteSecondaryAdmin(string id)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetUsersConfigAsync();
        var admin = config.SecondaryAdmins.FirstOrDefault(a => a.Id == id);
        
        await _configService.DeleteSecondaryAdminAsync(id);
        await LogAudit("DELETE_ADMIN", "SecondaryAdmin", $"Supprimé: {admin?.Email}");
        
        return Ok();
    }

    [HttpPost("admins/{id}/toggle")]
    public async Task<IActionResult> ToggleSecondaryAdmin(string id)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetUsersConfigAsync();
        var admin = config.SecondaryAdmins.FirstOrDefault(a => a.Id == id);
        if (admin == null) return NotFound();

        admin.IsActive = !admin.IsActive;
        await _configService.UpdateSecondaryAdminAsync(id, admin);
        await LogAudit("TOGGLE_ADMIN", "SecondaryAdmin", $"{(admin.IsActive ? "Activé" : "Désactivé")}: {admin.Email}");
        
        return Ok(admin);
    }

    // ==================== Roles ====================

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var config = await _configService.GetUsersConfigAsync();
        var roles = config.Roles ?? new List<Role>();
        if (roles.Count == 0)
            roles = DefaultUsersConfig.GetDefaultRoles();
        return Ok(roles);
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions()
    {
        var config = await _configService.GetUsersConfigAsync();
        var permissions = config.AvailablePermissions ?? new List<Permission>();
        if (permissions.Count == 0)
            permissions = DefaultUsersConfig.GetDefaultPermissions();
        return Ok(permissions);
    }

    // ==================== Features ====================

    [HttpGet("features")]
    public async Task<IActionResult> GetFeatures()
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var config = await _configService.GetFeaturesConfigAsync();
        var features = (config.Features != null && config.Features.Count > 0)
            ? config.Features
            : DefaultFeaturesConfig.GetDefaultFeatures();

        // If secondary admin, filter by allowed features
        if (!user.IsPrimaryAdmin && user.IsSecondaryAdmin)
        {
            features = features
                .Where(f => user.AllowedFeatures.Contains("*") || user.AllowedFeatures.Contains(f.Id))
                .ToList();
        }

        return Ok(features);
    }

    [HttpPut("features/{id}")]
    public async Task<IActionResult> UpdateFeature(string id, [FromBody] Feature feature)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetFeaturesConfigAsync();
        var index = config.Features.FindIndex(f => f.Id == id);
        if (index < 0) return NotFound();
        
        config.Features[index] = feature;
        await _configService.SaveFeaturesConfigAsync(config);
        await LogAudit("UPDATE_FEATURE", "Feature", $"Modifié: {feature.Name}");
        
        return Ok(feature);
    }

    // ==================== Settings ====================

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var settings = await _configService.GetSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] Settings settings)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        await _configService.SaveSettingsAsync(settings);
        await LogAudit("UPDATE_SETTINGS", "Settings", "Paramètres mis à jour");
        
        return Ok(settings);
    }

    // ==================== Graph API / Intune ====================

    [HttpGet("graph/test")]
    public async Task<IActionResult> TestGraphConnection()
    {
        var result = await _graphService.TestConnectionAsync();
        return Ok(new { connected = result });
    }

    [HttpGet("graph/devices")]
    public async Task<IActionResult> GetDevices()
    {
        if (!await _userContext.HasPermissionAsync("devices.read"))
            return Forbid();

        var devices = await _graphService.GetManagedDevicesAsync();
        var user = await _userContext.GetCurrentUserAsync();
        if (user != null && user.IsSecondaryAdmin && user.AllowedDeviceTypes.Count > 0 && !user.AllowedDeviceTypes.Contains("*"))
        {
            devices = devices.Where(d => DeviceMatchesAllowedTypes(d.OperatingSystem, user.AllowedDeviceTypes)).ToList();
        }
        return Ok(devices);
    }

    private static bool DeviceMatchesAllowedTypes(string operatingSystem, List<string> allowed)
    {
        var os = (operatingSystem ?? "").ToLowerInvariant();
        foreach (var t in allowed)
        {
            var label = t?.ToLowerInvariant() ?? "";
            if (label == "*") return true;
            if (label == "windows" && os.Contains("windows")) return true;
            if ((label == "macos" || label == "mac") && (os.Contains("mac") || os.Contains("mac os"))) return true;
            if (label == "android" && os.Contains("android")) return true;
            if ((label == "ios" || label == "ipados") && (os.Contains("ios") || os.Contains("ipados"))) return true;
            if (label == "linux" && os.Contains("linux")) return true;
        }
        return false;
    }

    [HttpGet("graph/devices/{id}")]
    public async Task<IActionResult> GetDevice(string id)
    {
        if (!await _userContext.HasPermissionAsync("devices.read"))
            return Forbid();

        var device = await _graphService.GetDeviceAsync(id);
        return device != null ? Ok(device) : NotFound();
    }

    [HttpPost("graph/devices/{id}/sync")]
    public async Task<IActionResult> SyncDevice(string id)
    {
        if (!await _userContext.CanPerformActionAsync("devices.sync"))
            return Forbid();

        var result = await _graphService.SyncDeviceAsync(id);
        if (result)
            await LogAudit("SYNC_DEVICE", "Device", $"Synced: {id}");
        
        return result ? Ok() : BadRequest("Sync failed");
    }

    [HttpPost("graph/devices/{id}/restart")]
    public async Task<IActionResult> RestartDevice(string id)
    {
        if (!await _userContext.CanPerformActionAsync("devices.restart"))
            return Forbid();

        var result = await _graphService.RestartDeviceAsync(id);
        if (result)
            await LogAudit("RESTART_DEVICE", "Device", $"Restarted: {id}");
        
        return result ? Ok() : BadRequest("Restart failed");
    }

    [HttpPost("graph/devices/{id}/wipe")]
    public async Task<IActionResult> WipeDevice(string id)
    {
        if (!await _userContext.CanPerformActionAsync("devices.wipe"))
            return Forbid();

        var result = await _graphService.WipeDeviceAsync(id);
        if (result)
            await LogAudit("WIPE_DEVICE", "Device", $"Wiped: {id}");
        
        return result ? Ok() : BadRequest("Wipe failed");
    }

    [HttpPost("graph/devices/{id}/retire")]
    public async Task<IActionResult> RetireDevice(string id)
    {
        if (!await _userContext.CanPerformActionAsync("devices.retire"))
            return Forbid();

        var result = await _graphService.RetireDeviceAsync(id);
        if (result)
            await LogAudit("RETIRE_DEVICE", "Device", $"Retired: {id}");
        
        return result ? Ok() : BadRequest("Retire failed");
    }

    [HttpPost("graph/devices/{id}/set-primary-user")]
    public async Task<IActionResult> SetPrimaryUser(string id, [FromBody] SetPrimaryUserRequest req)
    {
        if (!await _userContext.CanPerformActionAsync("devices.setPrimaryUser"))
            return Forbid();
        if (string.IsNullOrEmpty(req?.UserId))
            return BadRequest("userId requis");

        var result = await _graphService.SetPrimaryUserAsync(id, req.UserId);
        if (result)
            await LogAudit("SET_PRIMARY_USER", "Device", $"Device {id} -> user {req.UserId}");
        return result ? Ok(new { success = true }) : BadRequest("Set primary user failed");
    }

    [HttpGet("graph/users")]
    public async Task<IActionResult> GetIntuneUsers()
    {
        if (!await _userContext.HasPermissionAsync("users.read"))
            return Forbid();

        var users = await _graphService.GetUsersAsync();
        return Ok(users);
    }

    [HttpGet("graph/users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string? q, [FromQuery] int top = 20)
    {
        if (!await _userContext.HasPermissionAsync("users.read"))
            return Forbid();

        var users = await _graphService.SearchUsersAsync(q ?? "", Math.Min(top, 30));
        return Ok(users);
    }

    [HttpGet("graph/users/{id}/devices")]
    public async Task<IActionResult> GetUserDevices(string id)
    {
        if (!await _userContext.HasPermissionAsync("users.read"))
            return Forbid();

        var devices = await _graphService.GetUserDevicesAsync(id);
        return Ok(devices);
    }

    [HttpGet("graph/apps")]
    public async Task<IActionResult> GetApps()
    {
        if (!await _userContext.HasPermissionAsync("apps.read"))
            return Forbid();

        var apps = await _graphService.GetAppsAsync();
        return Ok(apps);
    }

    [HttpGet("graph/policies/compliance")]
    public async Task<IActionResult> GetCompliancePolicies()
    {
        if (!await _userContext.HasPermissionAsync("policies.read"))
            return Forbid();

        var policies = await _graphService.GetCompliancePoliciesAsync();
        return Ok(policies);
    }

    // ==================== Audit ====================

    [HttpGet("audit")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 100)
    {
        var user = await _userContext.GetCurrentUserAsync();
        if (user?.IsPrimaryAdmin != true)
            return Forbid();

        var config = await _configService.GetAuditLogsAsync();
        var logs = config.AuditLogs.Take(limit);
        return Ok(logs);
    }

    private async Task LogAudit(string action, string resource, string details)
    {
        var user = await _userContext.GetCurrentUserAsync();
        var log = new AuditLog
        {
            Action = action,
            Resource = resource,
            Details = details,
            UserEmail = user?.Email ?? "unknown",
            UserType = user?.IsPrimaryAdmin == true ? "PrimaryAdmin" : "SecondaryAdmin",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            Success = true
        };
        await _configService.AddAuditLogAsync(log);
    }

    // ==================== Setup & Configuration ====================

    [HttpGet("setup/storage")]
    [Authorize(Policy = "PrimaryAdmin")]
    public IActionResult GetStorageSettings()
    {
        var isSql = string.Equals(_storageSettings.Provider, StorageProvider.SqlServer, StringComparison.OrdinalIgnoreCase);
        var en = GetRequestLanguage() == "en";
        return Ok(new
        {
            provider = _storageSettings.Provider,
            currentModeDescription = isSql ? (en ? "SQL Server" : "SQL Server") : (en ? "JSON files (Config/)" : "Fichiers JSON (Config/)"),
            noticeRestart = en
                ? "The storage shown is the one loaded at startup. After any change, restart the IIS application pool (or the website) to apply."
                : "Le stockage affiché est celui chargé au démarrage. Après toute modification, redémarrez le pool d'applications IIS (ou le site web) pour l'appliquer.",
            server = _storageSettings.Server,
            port = _storageSettings.Port,
            database = _storageSettings.Database,
            userId = _storageSettings.UserId,
            integratedSecurity = _storageSettings.IntegratedSecurity,
            hasConnectionString = !string.IsNullOrEmpty(_storageSettings.ConnectionString)
        });
    }

    /// <summary>Teste la connexion à la base SQL sans enregistrer.</summary>
    [HttpPost("setup/storage/test")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> TestStorageConnection([FromBody] StorageSettingsRequest request)
    {
        var en = GetRequestLanguage(request?.Lang) == "en";
        try
        {
            var settings = BuildStorageSettingsFromRequest(request!);
            var connStr = StorageBootstrap.BuildConnectionString(settings);
            await using var conn = new Microsoft.Data.SqlClient.SqlConnection(connStr);
            await conn.OpenAsync();
            return Ok(new { ok = true, message = en ? "Connection successful." : "Connexion réussie." });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Storage connection test failed");
            return BadRequest(new { ok = false, message = ex.Message });
        }
    }

    /// <summary>Crée la table ConfigStore dans la base (sans enregistrer le mode de stockage).</summary>
    [HttpPost("setup/storage/setup-tables")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> SetupStorageTables([FromBody] StorageSettingsRequest request)
    {
        var en = GetRequestLanguage(request?.Lang) == "en";
        try
        {
            var settings = BuildStorageSettingsFromRequest(request!);
            var connStr = StorageBootstrap.BuildConnectionString(settings);
            await SqlConfigRepository.EnsureTablesAsync(connStr, _logger);
            return Ok(new { ok = true, message = en ? "Tables created or already present." : "Tables créées ou déjà présentes." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Setup storage tables failed");
            return BadRequest(new { ok = false, message = ex.Message });
        }
    }

    /// <summary>Crée les fichiers JSON dans Config/ et bascule le stockage en mode Json.</summary>
    [HttpPost("setup/storage/ensure-json")]
    [Authorize(Policy = "PrimaryAdmin")]
    public IActionResult EnsureJsonStorage([FromQuery] string? lang = null)
    {
        var en = GetRequestLanguage(lang) == "en";
        try
        {
            StorageBootstrap.EnsureJsonConfigFiles(_env.ContentRootPath);
            var settings = new StorageSettings { Provider = StorageProvider.Json };
            StorageBootstrap.Save(_env.ContentRootPath, settings);
            _logger.LogInformation("Storage switched to Json; config files ensured.");
            return Ok(new { message = en ? "JSON files created. Restart the IIS application pool (or website) to switch to JSON mode." : "Fichiers JSON créés. Redémarrez le pool d'applications IIS (ou le site web) pour passer en mode Fichiers JSON." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ensure JSON storage failed");
            return StatusCode(500, new { message = (en ? "Error: " : "Erreur : ") + ex.Message });
        }
    }

    [HttpPost("setup/storage")]
    [Authorize(Policy = "PrimaryAdmin")]
    public IActionResult SaveStorageSettings([FromBody] StorageSettingsRequest request)
    {
        var en = GetRequestLanguage(request?.Lang) == "en";
        try
        {
            var provider = request!.Provider ?? StorageProvider.Json;
            if (string.IsNullOrWhiteSpace(provider))
                provider = StorageProvider.Json;

            var settings = new StorageSettings
            {
                Provider = provider,
                ConnectionString = string.IsNullOrWhiteSpace(request.ConnectionString) ? null : request.ConnectionString.Trim(),
                Server = request.Server?.Trim(),
                Port = request.Port,
                Database = request.Database?.Trim(),
                IntegratedSecurity = request.IntegratedSecurity,
                UserId = request.IntegratedSecurity ? null : request.UserId?.Trim(),
                Password = request.IntegratedSecurity ? null : request.Password
            };

            StorageBootstrap.Save(_env.ContentRootPath, settings);

            if (string.Equals(settings.Provider, StorageProvider.Json, StringComparison.OrdinalIgnoreCase))
                StorageBootstrap.EnsureJsonConfigFiles(_env.ContentRootPath);

            _logger.LogInformation("Storage settings updated to {Provider}", settings.Provider);
            return Ok(new { message = en ? "Settings saved. Restart the IIS application pool (or website) for the new storage mode to take effect." : "Configuration enregistrée. Redémarrez le pool d'applications IIS (ou le site web) pour que le nouveau mode de stockage soit pris en compte." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving storage settings");
            return StatusCode(500, new { message = en ? "Error saving storage configuration." : "Erreur lors de l'enregistrement de la configuration de stockage." });
        }
    }

    private static StorageSettings BuildStorageSettingsFromRequest(StorageSettingsRequest request)
    {
        return new StorageSettings
        {
            ConnectionString = string.IsNullOrWhiteSpace(request.ConnectionString) ? null : request.ConnectionString.Trim(),
            Server = request.Server?.Trim(),
            Port = request.Port,
            Database = request.Database?.Trim(),
            IntegratedSecurity = request.IntegratedSecurity,
            UserId = request.IntegratedSecurity ? null : request.UserId?.Trim(),
            Password = request.IntegratedSecurity ? null : request.Password
        };
    }

    // ==================== Sauvegarde / Restauration ====================

    /// <summary>
    /// Télécharge une sauvegarde chiffrée. La clé de restauration est renvoyée dans l'en-tête X-Restore-Key (à afficher une seule fois).
    /// </summary>
    [HttpGet("backup/download")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> DownloadBackup(CancellationToken ct)
    {
        try
        {
            var user = await _userContext.GetCurrentUserAsync();
            var createdBy = user?.Email ?? "unknown";
            var result = await _backupRestore.CreateBackupAsync(createdBy, ct);
            var fileName = $"IntuneWksManager-backup-{DateTime.UtcNow:yyyyMMdd-HHmmss}.enc";
            Response.Headers["X-Restore-Key"] = result.RestoreKey;
            return File(result.FileBytes, "application/octet-stream", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating backup");
            return StatusCode(500, new { message = "Erreur lors de la création de la sauvegarde." });
        }
    }

    /// <summary>
    /// Restaure la configuration à partir d'un fichier .enc. Pour les sauvegardes récentes (v3), la clé de restauration est requise.
    /// </summary>
    [HttpPost("backup/restore")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> RestoreBackup(IFormFile? file, [FromForm] string? restoreKey, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Aucun fichier de sauvegarde fourni." });

        try
        {
            await using var stream = file.OpenReadStream();
            await _backupRestore.RestoreBackupAsync(stream, restoreKey, ct);
            await _graphService.ReinitializeClientAsync();
            await LogAudit("backup.restore", "Sauvegarde", "Restauration effectuée : " + file.FileName);
            return Ok(new { message = "Configuration restaurée avec succès. Redémarrez l'application si le mode de stockage a changé." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid backup file");
            return BadRequest(new { message = ex.Message });
        }
        catch (CryptographicException ex)
        {
            _logger.LogWarning(ex, "Backup decryption failed");
            return BadRequest(new { message = "Fichier de sauvegarde invalide ou clé de chiffrement différente (config réinitialisée ?). Impossible de déchiffrer." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring backup");
            return StatusCode(500, new { message = "Erreur lors de la restauration : " + ex.Message });
        }
    }

    [HttpGet("setup/azuread")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> GetAzureAdSecrets()
    {
        try
        {
            var secrets = await _configService.GetAzureAdSecretsAsync();
            // Ne pas retourner le secret en clair, seulement indiquer s'il est configuré
            return Ok(new
            {
                tenantId = secrets.TenantId,
                clientId = secrets.ClientId,
                isConfigured = !string.IsNullOrEmpty(secrets.ClientSecret),
                lastUpdated = secrets.LastUpdated,
                updatedBy = secrets.UpdatedBy
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Azure AD secrets");
            return StatusCode(500, new { message = "Erreur lors de la récupération de la configuration" });
        }
    }

    /// <summary>
    /// Génère une valeur chiffrée pour le ClientSecret à placer dans appsettings.json.
    /// Utiliser la réponse "encrypted" dans AzureAd:ClientSecret (au lieu du secret en clair).
    /// </summary>
    [HttpPost("setup/encrypt-client-secret")]
    [Authorize(Policy = "PrimaryAdmin")]
    public IActionResult EncryptClientSecret([FromBody] EncryptSecretRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request?.ClientSecret))
                return BadRequest(new { message = "ClientSecret est requis." });
            var encryptionService = HttpContext.RequestServices.GetRequiredService<IEncryptionService>();
            var encrypted = encryptionService.Encrypt(request.ClientSecret);
            return Ok(new { encrypted });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error encrypting client secret");
            return StatusCode(500, new { message = "Erreur lors du chiffrement." });
        }
    }

    [HttpPost("setup/azuread")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> SaveAzureAdSecrets([FromBody] AzureAdSecretsRequest request)
    {
        try
        {
            var user = await _userContext.GetCurrentUserAsync();
            if (user == null || !user.IsPrimaryAdmin)
                return Unauthorized();

            var encryptionService = HttpContext.RequestServices.GetRequiredService<IEncryptionService>();
            
            var secrets = new AzureAdSecrets
            {
                TenantId = request.TenantId ?? string.Empty,
                ClientId = request.ClientId ?? string.Empty,
                ClientSecret = string.IsNullOrEmpty(request.ClientSecret) 
                    ? (await _configService.GetAzureAdSecretsAsync()).ClientSecret 
                    : encryptionService.Encrypt(request.ClientSecret),
                LastUpdated = DateTime.UtcNow,
                UpdatedBy = user.Email
            };

            await _configService.SaveAzureAdSecretsAsync(secrets);

            await _graphService.ReinitializeClientAsync();

            await LogAudit("setup.azuread.update", "Azure AD Secrets", $"Tenant: {secrets.TenantId}, Client: {secrets.ClientId}");

            return Ok(new { message = "Configuration Azure AD sauvegardée avec succès" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving Azure AD secrets");
            await LogAudit("setup.azuread.update", "Azure AD Secrets", $"Erreur: {ex.Message}");
            return StatusCode(500, new { message = "Erreur lors de la sauvegarde de la configuration" });
        }
    }

    [HttpGet("setup/primary-admins")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> GetPrimaryAdmins()
    {
        try
        {
            var config = await _configService.GetUsersConfigAsync();
            return Ok(config.PrimaryAdmins);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting primary admins");
            return StatusCode(500, new { message = "Erreur lors de la récupération des administrateurs principaux" });
        }
    }

    [HttpPost("setup/primary-admins")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> AddPrimaryAdmin([FromBody] PrimaryAdminRequest request)
    {
        try
        {
            var user = await _userContext.GetCurrentUserAsync();
            if (user == null || !user.IsPrimaryAdmin)
                return Unauthorized();

            var config = await _configService.GetUsersConfigAsync();
            
            if (config.PrimaryAdmins.Any(a => a.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest(new { message = "Cet administrateur existe déjà" });
            }

            var admin = new PrimaryAdmin
            {
                Id = Guid.NewGuid().ToString(),
                Email = request.Email,
                DisplayName = request.DisplayName ?? request.Email,
                AzureObjectId = request.AzureObjectId ?? string.Empty,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            config.PrimaryAdmins.Add(admin);
            await _configService.SaveUsersConfigAsync(config);

            await LogAudit("setup.primaryadmin.add", $"Primary Admin: {admin.Email}", $"Added by {user.Email}");

            return Ok(admin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding primary admin");
            return StatusCode(500, new { message = "Erreur lors de l'ajout de l'administrateur" });
        }
    }

    [HttpDelete("setup/primary-admins/{id}")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> DeletePrimaryAdmin(string id)
    {
        try
        {
            var user = await _userContext.GetCurrentUserAsync();
            if (user == null || !user.IsPrimaryAdmin)
                return Unauthorized();

            var config = await _configService.GetUsersConfigAsync();
            var admin = config.PrimaryAdmins.FirstOrDefault(a => a.Id == id);
            
            if (admin == null)
                return NotFound(new { message = "Administrateur non trouvé" });

            // Ne pas permettre de supprimer le dernier admin principal
            if (config.PrimaryAdmins.Count(a => a.IsActive) <= 1 && admin.IsActive)
            {
                return BadRequest(new { message = "Impossible de supprimer le dernier administrateur principal actif" });
            }

            config.PrimaryAdmins.Remove(admin);
            await _configService.SaveUsersConfigAsync(config);

            await LogAudit("setup.primaryadmin.delete", $"Primary Admin: {admin.Email}", $"Deleted by {user.Email}");

            return Ok(new { message = "Administrateur supprimé avec succès" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting primary admin");
            return StatusCode(500, new { message = "Erreur lors de la suppression de l'administrateur" });
        }
    }

    [HttpPut("setup/primary-admins/{id}")]
    [Authorize(Policy = "PrimaryAdmin")]
    public async Task<IActionResult> UpdatePrimaryAdmin(string id, [FromBody] PrimaryAdminRequest request)
    {
        try
        {
            var user = await _userContext.GetCurrentUserAsync();
            if (user == null || !user.IsPrimaryAdmin)
                return Unauthorized();

            var config = await _configService.GetUsersConfigAsync();
            var admin = config.PrimaryAdmins.FirstOrDefault(a => a.Id == id);
            
            if (admin == null)
                return NotFound(new { message = "Administrateur non trouvé" });

            // Vérifier si l'email existe déjà pour un autre admin
            if (!string.IsNullOrEmpty(request.Email) && 
                config.PrimaryAdmins.Any(a => a.Id != id && a.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest(new { message = "Cet email est déjà utilisé par un autre administrateur" });
            }

            if (!string.IsNullOrEmpty(request.Email))
                admin.Email = request.Email;
            if (!string.IsNullOrEmpty(request.DisplayName))
                admin.DisplayName = request.DisplayName;
            if (!string.IsNullOrEmpty(request.AzureObjectId))
                admin.AzureObjectId = request.AzureObjectId;
            if (request.IsActive.HasValue)
                admin.IsActive = request.IsActive.Value;

            await _configService.SaveUsersConfigAsync(config);

            await LogAudit("setup.primaryadmin.update", $"Primary Admin: {admin.Email}", $"Updated by {user.Email}");

            return Ok(admin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating primary admin");
            return StatusCode(500, new { message = "Erreur lors de la mise à jour de l'administrateur" });
        }
    }
}

public class ReviewRequest
{
    public string? Note { get; set; }
}

public class SetPrimaryUserRequest
{
    public string? UserId { get; set; }
}

public class EncryptSecretRequest
{
    public string? ClientSecret { get; set; }
}

public class AzureAdSecretsRequest
{
    public string? TenantId { get; set; }
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
}

public class PrimaryAdminRequest
{
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? AzureObjectId { get; set; }
    public bool? IsActive { get; set; }
}

public class StorageSettingsRequest
{
    public string? Provider { get; set; }
    public string? ConnectionString { get; set; }
    public string? Server { get; set; }
    public int? Port { get; set; }
    public string? Database { get; set; }
    public string? UserId { get; set; }
    public string? Password { get; set; }
    public bool IntegratedSecurity { get; set; }
    /// <summary>Langue pour les messages de réponse (fr-FR, en).</summary>
    public string? Lang { get; set; }
}
