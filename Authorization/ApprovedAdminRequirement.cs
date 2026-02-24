using Microsoft.AspNetCore.Authorization;

namespace IntuneWksManager.Authorization;

/// <summary>
/// Exigence d'autorisation : l'utilisateur doit être admin principal ou admin secondaire approuvé.
/// </summary>
public class ApprovedAdminRequirement : IAuthorizationRequirement
{
}
