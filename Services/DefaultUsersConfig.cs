using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

/// <summary>
/// Rôles et permissions par défaut (affichés lorsque la config SQL est vide ou désérialisée sans ces listes).
/// </summary>
public static class DefaultUsersConfig
{
    public static List<Role> GetDefaultRoles()
    {
        return new List<Role>
        {
            new() { Name = "FullAdmin", Description = "Administration complète (admins secondaires)", Permissions = new List<string> { "devices.read", "devices.write", "devices.wipe", "devices.sync", "devices.restart", "devices.retire", "devices.setPrimaryUser", "users.read", "apps.read", "apps.assign", "policies.read", "reports.read", "reports.compliance", "reports.devices", "reports.apps", "reports.export" } },
            new() { Name = "Operator", Description = "Opérations courantes sur les appareils", Permissions = new List<string> { "devices.read", "devices.sync", "devices.restart", "users.read", "apps.read", "policies.read", "reports.read", "reports.compliance", "reports.devices", "reports.apps" } },
            new() { Name = "Viewer", Description = "Consultation uniquement", Permissions = new List<string> { "devices.read", "users.read", "apps.read", "policies.read", "reports.read", "reports.compliance", "reports.devices", "reports.apps" } },
            new() { Name = "Custom", Description = "Permissions personnalisées", Permissions = new List<string>() }
        };
    }

    public static List<Permission> GetDefaultPermissions()
    {
        return new List<Permission>
        {
            new() { Code = "devices.read", Name = "Lire les appareils", Category = "Appareils", Description = "Voir la liste des appareils et leurs détails" },
            new() { Code = "devices.write", Name = "Modifier les appareils", Category = "Appareils", Description = "Modifier les propriétés des appareils" },
            new() { Code = "devices.wipe", Name = "Effacer les appareils", Category = "Appareils", Description = "Effacement à distance (action critique)" },
            new() { Code = "devices.sync", Name = "Synchroniser les appareils", Category = "Appareils", Description = "Forcer la synchronisation Intune" },
            new() { Code = "devices.restart", Name = "Redémarrer les appareils", Category = "Appareils", Description = "Redémarrage à distance" },
            new() { Code = "devices.retire", Name = "Retirer les appareils", Category = "Appareils", Description = "Mise hors service (action critique)" },
            new() { Code = "devices.setPrimaryUser", Name = "Définir utilisateur principal", Category = "Appareils", Description = "Assigner l'utilisateur principal sur un appareil" },
            new() { Code = "users.read", Name = "Lire les utilisateurs", Category = "Utilisateurs", Description = "Voir les utilisateurs Azure AD" },
            new() { Code = "apps.read", Name = "Lire les applications", Category = "Applications", Description = "Voir les applications Intune" },
            new() { Code = "apps.assign", Name = "Assigner les applications", Category = "Applications", Description = "Assigner des apps aux appareils/groupes" },
            new() { Code = "policies.read", Name = "Lire les politiques", Category = "Politiques", Description = "Voir les politiques de conformité" },
            new() { Code = "reports.read", Name = "Consulter les rapports", Category = "Rapports", Description = "Accéder à la section Rapports (ou utiliser les permissions par type ci‑dessous)" },
            new() { Code = "reports.compliance", Name = "Rapport de conformité", Category = "Rapports", Description = "Voir le rapport de conformité des appareils" },
            new() { Code = "reports.devices", Name = "Rapport des appareils", Category = "Rapports", Description = "Voir le rapport répartition par OS" },
            new() { Code = "reports.apps", Name = "Rapport des applications", Category = "Rapports", Description = "Voir le rapport des applications" },
            new() { Code = "reports.export", Name = "Exporter les rapports", Category = "Rapports", Description = "Télécharger les rapports" }
        };
    }
}
