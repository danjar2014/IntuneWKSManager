# Prérequis et inscription d’application Azure AD (Entra ID) — IntuneWksManager

Ce document décrit les **prérequis** nécessaires pour faire tourner le projet et les **étapes détaillées** pour créer et configurer l’**App Registration** dans Microsoft Entra ID (Azure AD).

---

## 1. Prérequis

### 1.1 Environnement d’exécution

| Prérequis | Version / Détail |
|-----------|------------------|
| **.NET** | **.NET 8.0 SDK** (pour compiler et publier). Runtime .NET 8.0 pour l’exécution. |
| **Système d’exploitation** | **Windows** (le projet cible `[SupportedOSPlatform("windows")]` pour l’authentification Negotiate / SQL avec identité Windows). |
| **IIS** (déploiement production) | IIS avec **module ASP.NET Core** (Hosting Bundle .NET 8). |
| **PowerShell** | Pour les scripts de build/déploiement (`build.ps1`, `deploy-iis.ps1`, etc.). |

### 1.2 Stockage des données

- **Par défaut : stockage JSON**  
  Les fichiers de configuration (`users.json`, `features.json`, `settings.json`, `audit.json`, secrets Azure AD) sont dans le dossier `Config/`. Aucune base de données requise.

- **Optionnel : SQL Server**  
  Si vous utilisez `Config/storage.json` avec `"provider": "SqlServer"` :
  - **SQL Server** (local ou distant) avec une base de données (par défaut : `IntuneWksManager`).
  - Soit **Authentification Windows** (identité du pool d’applications IIS ou impersonation), soit **Authentification SQL** (utilisateur/mot de passe).
  - Le dossier `Config` doit rester accessible en lecture (au minimum) pour `storage.json`.

### 1.3 Droits et permissions

- **Dossier `Config`** : en **lecture/écriture** pour le compte sous lequel l’application s’exécute (ex. `IIS_IUSRS` sous IIS).
- **Dossier `logs`** (si utilisé) : en **écriture** pour les journaux.
- **Azure AD** : un compte avec droits pour **créer une inscription d’application** et **accorder le consentement administrateur** aux permissions d’application (rôle *Application Administrator* ou *Cloud Application Administrator*, ou équivalent).

### 1.4 Résumé minimal pour démarrer

- Windows + .NET 8 SDK  
- Une inscription d’application Entra ID (voir §2)  
- `appsettings.json` (ou User Secrets) avec `AzureAd` et au moins un `PrimaryAdmin`  
- Optionnel : IIS pour héberger en production  

---

## 2. Inscription d’application Azure AD (App Registration)

### 2.1 Créer l’inscription

1. Ouvrir le **portail Azure** : [https://portal.azure.com](https://portal.azure.com).
2. Aller dans **Microsoft Entra ID** (ou **Azure Active Directory**) > **Inscriptions d’applications** (App registrations).
3. Cliquer sur **Nouvelle inscription** (New registration).
4. Renseigner :
   - **Nom** : par ex. `IntuneWksManager`.
   - **Types de comptes pris en charge** :  
     - *Comptes dans cet annuaire organisationnel uniquement* (single tenant) en général.
   - **URI de redirection** : ne pas remplir pour l’instant (on le fera à l’étape 2.3).
5. Cliquer sur **Inscription**. Noter l’**ID d’application (Client ID)** et l’**ID de l’annuaire (Tenant ID)** (Overview de l’app).

### 2.2 Certificats et secrets (Client Secret)

1. Dans l’app, aller dans **Certificats et secrets** (Certificates & secrets).
2. Sous **Secrets client**, cliquer sur **Nouveau secret client**.
3. Description (ex. `IntuneWksManager secret`), durée (ex. 24 mois).
4. **Enregistrer** et **copier la valeur** immédiatement (elle ne sera plus visible ensuite).  
   Cette valeur est le **Client Secret** à mettre dans la configuration (voir §2.6 ou via la page « Configuration Azure AD » du portail après chiffrement).

### 2.3 Authentification — Redirect URIs et jetons ID

1. Aller dans **Authentification** (Authentication).
2. **URI de redirection** (Redirect URIs) :
   - Si l’application est à la **racine** du site (ex. `https://votredomaine.com`) :  
     - `https://votredomaine.com/signin-oidc`  
     - `https://votredomaine.com`
   - Si l’application est en **sous-application** (ex. `https://votredomaine.com/IntuneWksManager`) :  
     - `https://votredomaine.com/IntuneWksManager/signin-oidc`  
     - `https://votredomaine.com/IntuneWksManager`
   - En **développement local** (optionnel) :  
     - `https://localhost:7xxx/signin-oidc`  
     - `https://localhost:7xxx`  
     (remplacer `7xxx` par le port HTTPS de `launchSettings.json`.)
3. Sous **Octroi implicite et flux hybrides** (Implicit grant and hybrid flows) :  
   - Cocher **Jetons d’ID (utilisés pour les flux implicites et hybrides)** — **obligatoire** pour éviter l’erreur **AADSTS700054**.
4. **Enregistrer**.

### 2.4 Permissions d’API (Application permissions)

L’application utilise le **flux client credentials** (Client ID + Client Secret) pour appeler Microsoft Graph. Il faut des **permissions d’application** (et non « délégées » uniquement).

1. Aller dans **Autorisations d’API** (API permissions).
2. Cliquer sur **Ajouter une autorisation**.
3. Choisir **Microsoft Graph** > **Autorisations d’application**.
4. Ajouter les permissions suivantes (recherche par nom) :

| Permission | Description (résumé) |
|------------|----------------------|
| `DeviceManagementManagedDevices.ReadWrite.All` | Appareils gérés Intune : lecture, synchronisation, redémarrage, effacement, retrait, affectation d’utilisateur principal. |
| `DeviceManagementConfiguration.ReadWrite.All` | Politiques de conformité et profils de configuration. |
| `DeviceManagementApps.ReadWrite.All` | Applications gérées (Mobile Apps). |
| `User.Read.All` | Lecture des utilisateurs (liste, recherche, appareils par utilisateur). |
| `Directory.Read.All` | Lecture de l’annuaire (organisation, etc.). |

5. Cliquer sur **Ajouter des autorisations**.
6. **Accorder le consentement administrateur** : bouton **Accorder un consentement administrateur pour [votre organisation]** (Grant admin consent). Vérifier que la colonne « État » affiche une coche pour l’organisation.

### 2.5 Récapitulatif des valeurs à garder

- **Tenant ID** (ID de l’annuaire)  
- **Client ID** (ID d’application)  
- **Client Secret** (valeur du secret créé en 2.2)

Ces trois valeurs sont utilisées dans `appsettings.json` sous la section `AzureAd`, ou peuvent être saisies plus tard dans la page **Configuration système > Configuration Azure AD** du portail (avec possibilité de chiffrer le secret via l’API).

### 2.6 Configuration dans l’application

**Option A — Fichier de configuration (développement / premier déploiement)**

Dans `appsettings.json` (ou **User Secrets** en dev, sans committer le secret) :

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "VOTRE_TENANT_ID",
    "ClientId": "VOTRE_CLIENT_ID",
    "ClientSecret": "VOTRE_CLIENT_SECRET"
  },
  "PrimaryAdmin": {
    "Email": "admin@votredomaine.com",
    "DisplayName": "Administrateur Principal"
  }
}
```

- **PrimaryAdmin.Email** doit correspondre à l’identité de connexion Azure AD (UPN / e-mail) du premier administrateur.

**Option B — Configuration depuis l’interface (recommandé en production)**

1. Se connecter au portail en tant qu’**administrateur principal**.
2. Aller dans **Configuration système** > **Configuration Azure AD**.
3. Saisir **Tenant ID**, **Client ID** et **Client Secret**.
4. (Recommandé) Utiliser l’endpoint **POST /api/setup/encrypt-client-secret** pour obtenir une valeur chiffrée et la stocker (évite de garder le secret en clair).

**Sous-application IIS (PathBase)**

Si l’application est hébergée sous un chemin (ex. `/IntuneWksManager`), ajouter dans `appsettings.json` :

```json
"PathBase": "/IntuneWksManager"
```

Les Redirect URIs dans Azure AD doivent utiliser ce même chemin (voir §2.3).

---

## 3. Vérifications rapides

- **Connexion utilisateur (Entra ID)** : ouvrir l’URL du site, vous devez être redirigé vers la page de connexion Microsoft puis vers le portail.
- **Graph API** : dans le portail Admin, **Configuration système** > **Configuration Azure AD** > bouton **Tester Graph API**. Un succès confirme Tenant ID, Client ID, Client Secret et consentement.
- **AADSTS50011** : l’URL de redirection ne correspond pas ; vérifier les Redirect URIs (schéma, domaine, chemin, slash final).
- **AADSTS700054** : activer les **jetons d’ID** dans Authentication (voir §2.3).

---

## 4. Références

- [README.md](README.md) — installation, déploiement IIS, Redirect URIs, dépannage.
- Configuration avancée : stockage SQL (`Config/storage.json`), chiffrement du Client Secret, audit.
