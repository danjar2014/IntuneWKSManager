using System.Runtime.Versioning;
using System.Security.Principal;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using IntuneWksManager.Models;
using IntuneWksManager.Services;
using IntuneWksManager.Authorization;

[assembly: SupportedOSPlatform("windows")]

var builder = WebApplication.CreateBuilder(args);

// Forwarded headers (IIS / reverse proxy) — avant UseHttpsRedirection
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Azure AD (connexion utilisateur) + Negotiate (identité Windows pour SQL lorsque "Authentification Windows" est utilisée)
var authBuilder = builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme);
authBuilder.AddNegotiate();
authBuilder.AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"));

builder.Services.PostConfigure<OpenIdConnectOptions>(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
    // Flux hybrid (défaut) : compatible avec Microsoft.Identity.Web. Pour forcer "code" seul, décommenter :
    // options.ResponseType = "code";

    // Diagnostic en cas d'échec de connexion (logs + redirection vers /Error?message= en dev)
    var existingOnRemoteFailure = options.Events.OnRemoteFailure;
    options.Events.OnRemoteFailure = async context =>
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("EntraID.Auth");
        logger.LogError(context.Failure, "Échec connexion Entra ID: {Message}", context.Failure?.Message);
        if (context.Failure?.InnerException != null)
            logger.LogError(context.Failure.InnerException, "InnerException");
        // En dev, rediriger vers la page d'erreur avec le message pour diagnostic
        var env = context.HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        if (env.IsDevelopment())
        {
            var msg = Uri.EscapeDataString(context.Failure?.Message ?? "Erreur inconnue");
            context.Response.Redirect($"/Error?message={msg}");
            context.HandleResponse();
            return;
        }
        if (existingOnRemoteFailure != null)
            await existingOnRemoteFailure(context);
    };
});

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
    
    options.AddPolicy("PrimaryAdmin", policy =>
        policy.RequireAuthenticatedUser()
              .AddRequirements(new PrimaryAdminRequirement()));
    
    options.AddPolicy("ApprovedAdmin", policy =>
        policy.RequireAuthenticatedUser()
              .AddRequirements(new ApprovedAdminRequirement()));
});

builder.Services.AddScoped<IAuthorizationHandler, AdminAuthorizationHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ApprovedAdminAuthorizationHandler>();

builder.Services.AddControllersWithViews(options =>
{
    var policy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    options.Filters.Add(new AuthorizeFilter(policy));
})
.AddMicrosoftIdentityUI();

builder.Services.AddRazorPages();

// Stockage : JSON ou SQL selon Config/storage.json
var contentRoot = builder.Environment.ContentRootPath;
var storageSettings = StorageBootstrap.Load(contentRoot);
builder.Services.AddSingleton(storageSettings);

builder.Services.AddSingleton<IConfigRepository>(sp =>
{
    var useSql = string.Equals(storageSettings.Provider, StorageProvider.SqlServer, StringComparison.OrdinalIgnoreCase);
    if (useSql)
    {
        var connStr = StorageBootstrap.BuildConnectionString(storageSettings);
        if (storageSettings.IntegratedSecurity)
        {
            // Connexion SQL sous l'identité Windows de l'utilisateur de la session (pas le pool IIS)
            return new ImpersonatingSqlConfigRepository(
                connStr,
                sp.GetRequiredService<IHttpContextAccessor>(),
                sp.GetRequiredService<ILoggerFactory>());
        }
        return new SqlConfigRepository(connStr, sp.GetRequiredService<ILogger<SqlConfigRepository>>());
    }
    return new JsonConfigRepository(
        sp.GetRequiredService<IWebHostEnvironment>(),
        sp.GetRequiredService<ILogger<JsonConfigRepository>>());
});

// Services
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddSingleton<IConfigService, ConfigService>();
builder.Services.AddSingleton<IBackupRestoreService, BackupRestoreService>();
builder.Services.AddSingleton<IGraphService, GraphService>();
builder.Services.AddScoped<IUserContextService, UserContextService>();

// Session
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseStaticFiles();

var pathBase = builder.Configuration["PathBase"];
if (!string.IsNullOrEmpty(pathBase))
{
    pathBase = pathBase.TrimEnd('/');
    if (!string.IsNullOrEmpty(pathBase))
        app.UsePathBase(pathBase);
}

app.UseRouting();

app.UseAuthentication();
// Lorsque le stockage SQL utilise "Authentification Windows", on récupère l'identité Windows de l'utilisateur (session) pour les connexions SQL.
// Activer l'authentification Windows dans IIS pour cette application. Sur les requêtes applicatives (hors fichiers statiques), on demande les identifiants Windows si absents.
app.Use(async (context, next) =>
{
    var useSql = string.Equals(storageSettings.Provider, StorageProvider.SqlServer, StringComparison.OrdinalIgnoreCase);
    if (!useSql || !storageSettings.IntegratedSecurity)
    {
        await next();
        return;
    }

    var logger = context.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("IntuneWksManager.Negotiate");
    try
    {
        var result = await context.AuthenticateAsync(NegotiateDefaults.AuthenticationScheme);
        if (result.Succeeded && result.Principal?.Identity is WindowsIdentity wi)
        {
            context.Items[ImpersonatingSqlConfigRepository.IdentityKey] = wi;
            await next();
            return;
        }

        var path = context.Request.Path.Value ?? "";
        bool isStatic = path.Contains('.') && !path.StartsWith("/api", StringComparison.OrdinalIgnoreCase);
        if (isStatic)
        {
            await next();
            return;
        }

        await context.ChallengeAsync(NegotiateDefaults.AuthenticationScheme);
    }
    catch (Exception ex)
    {
        logger?.LogError(ex, "Erreur Authentification Windows (Negotiate) pour la connexion SQL intégrée.");
        context.Response.StatusCode = 503;
        context.Response.ContentType = "text/plain; charset=utf-8";
        var message = "L'authentification Windows (Negotiate) a échoué. Vérifiez que l'authentification Windows est activée pour cette application dans IIS (Provider Windows Authentication, module Negotiate). Détail : " + ex.Message;
        await context.Response.WriteAsync(message);
    }
});
app.UseAuthorization();
app.UseSession();

// Favicon par défaut (évite 404 quand le navigateur demande /favicon.ico)
app.MapGet("/favicon.ico", () =>
{
    const string svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"><text y=\"22\" font-size=\"20\" fill=\"#0078d4\">IW</text></svg>";
    return Results.Content(svg, "image/svg+xml");
}).AllowAnonymous();

app.MapRazorPages();
app.MapControllers();

// Point d'entrée alternatif pour la connexion Entra ID (redirige vers l'endpoint authorize avec flux Authorization Code)
app.MapGet("/oauth2/provider/entraid/authorize", async (HttpContext context) =>
{
    var returnUrl = context.Request.Query["returnUrl"].FirstOrDefault() ?? "/";
    var props = new Microsoft.AspNetCore.Authentication.AuthenticationProperties { RedirectUri = returnUrl };
    await context.ChallengeAsync(OpenIdConnectDefaults.AuthenticationScheme, props);
}).AllowAnonymous();

app.Run();
