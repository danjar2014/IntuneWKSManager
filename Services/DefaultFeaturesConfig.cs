using IntuneWksManager.Models;

namespace IntuneWksManager.Services;

/// <summary>
/// Fonctionnalités par défaut (affichées dans le modal admin lorsque la config SQL est vide).
/// </summary>
public static class DefaultFeaturesConfig
{
    public static List<Feature> GetDefaultFeatures()
    {
        return new List<Feature>
        {
            new() { Id = "device-management", Name = "Gestion des Appareils", Description = "Gérer les appareils Windows inscrits dans Intune", RequiredPermission = "devices.read" },
            new() { Id = "user-management", Name = "Gestion des Utilisateurs", Description = "Consulter les utilisateurs Azure AD", RequiredPermission = "users.read" },
            new() { Id = "app-management", Name = "Gestion des Applications", Description = "Gérer les applications Intune", RequiredPermission = "apps.read" },
            new() { Id = "policy-management", Name = "Gestion des Politiques", Description = "Politiques de configuration", RequiredPermission = "policies.read" },
            new() { Id = "reporting", Name = "Rapports", Description = "Rapports et tableaux de bord", RequiredPermission = "reports.read" }
        };
    }
}
