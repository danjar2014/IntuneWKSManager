using Microsoft.AspNetCore.Authorization;

namespace IntuneWksManager.Authorization;

/// <summary>
/// Exigence d'autorisation : l'utilisateur doit être administrateur principal.
/// </summary>
public class PrimaryAdminRequirement : IAuthorizationRequirement
{
}
