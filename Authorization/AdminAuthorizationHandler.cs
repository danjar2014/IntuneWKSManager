using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using IntuneWksManager.Services;

namespace IntuneWksManager.Authorization;

/// <summary>
/// Gère l'exigence PrimaryAdmin en utilisant IConfigService.
/// Corrige le bug où context.Resource as IConfigService était toujours null.
/// </summary>
public class AdminAuthorizationHandler : AuthorizationHandler<PrimaryAdminRequirement>
{
    private readonly IConfigService _configService;

    public AdminAuthorizationHandler(IConfigService configService)
    {
        _configService = configService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PrimaryAdminRequirement requirement)
    {
        var email = GetUserEmail(context);
        if (string.IsNullOrEmpty(email))
        {
            return;
        }

        var isPrimary = await _configService.IsPrimaryAdminAsync(email);
        if (isPrimary)
        {
            context.Succeed(requirement);
        }
    }

    private static string? GetUserEmail(AuthorizationHandlerContext context)
    {
        var user = context.User;
        return user.FindFirst("preferred_username")?.Value
            ?? user.FindFirst("email")?.Value
            ?? user.FindFirst(ClaimTypes.Email)?.Value;
    }
}

public class ApprovedAdminAuthorizationHandler : AuthorizationHandler<ApprovedAdminRequirement>
{
    private readonly IConfigService _configService;

    public ApprovedAdminAuthorizationHandler(IConfigService configService)
    {
        _configService = configService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ApprovedAdminRequirement requirement)
    {
        var email = GetUserEmail(context);
        if (string.IsNullOrEmpty(email))
        {
            return;
        }

        var isPrimary = await _configService.IsPrimaryAdminAsync(email);
        var isApproved = await _configService.IsApprovedSecondaryAdminAsync(email);
        if (isPrimary || isApproved)
        {
            context.Succeed(requirement);
        }
    }

    private static string? GetUserEmail(AuthorizationHandlerContext context)
    {
        var user = context.User;
        return user.FindFirst("preferred_username")?.Value
            ?? user.FindFirst("email")?.Value
            ?? user.FindFirst(ClaimTypes.Email)?.Value;
    }
}

