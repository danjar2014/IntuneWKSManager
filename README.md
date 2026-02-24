# IntuneWksManager

Portail d'administration interne pour gérer les fonctionnalités Intune via Microsoft Graph API.

## 🚀 Fonctionnalités

### Administration
- **Gestion des utilisateurs** - Créer, modifier, supprimer les utilisateurs du portail
- **Rôles & RBAC** - Système de contrôle d'accès basé sur les rôles avec permissions granulaires
- **Gestion des fonctionnalités** - Activer/désactiver les fonctionnalités par module
- **Gestion des clients** - Multi-tenant avec fonctionnalités personnalisées par client

### Intune via Graph API
- **Appareils** - Liste, synchronisation, redémarrage, effacement des appareils Windows
- **Utilisateurs Azure AD** - Consultation des utilisateurs et leurs appareils
- **Applications** - Liste des applications déployées via Intune
- **Politiques** - Conformité et profils de configuration

### Système
- **Paramètres du portail** - Thème, timeout, maintenance
- **Journal d'audit** - Traçabilité de toutes les actions

## 📋 Prérequis

- .NET 8.0 SDK
- IIS avec le module ASP.NET Core
- Application Azure AD enregistrée avec les permissions Graph API

## 🔨 Compilation

- **Solution** : `dotnet build IntuneWksManager.sln` ou `.\build.ps1`.
- **Avec dossier de sortie** : ne pas utiliser `--output` (cause NETSDK1194). Utiliser à la place :
  - `dotnet build IntuneWksManager.sln -p:OutputPath=.\dossier` ou
  - `.\build.ps1 -OutputPath .\dossier` ou
  - compiler le projet : `dotnet build IntuneWksManager.csproj -o .\dossier`.
- **Publication** : `dotnet publish -c Release -o ./publish-iis`.

## 🔧 Configuration Azure AD

1. Créer une application dans **Azure AD** (Entra ID) > **App registrations** > **New registration**
2. **Authentication** :
   - Ajouter les **Redirect URIs** (voir §6 ci‑dessous)
   - Sous *Implicit grant and hybrid flows*, cocher **ID tokens (used for implicit and hybrid flows)** — requis pour éviter l’erreur **AADSTS700054**
3. **Certificates & secrets** : créer un **Client secret**
4. **API permissions** (Application permissions) :
   - `DeviceManagementManagedDevices.ReadWrite.All`
   - `DeviceManagementConfiguration.ReadWrite.All`
   - `DeviceManagementApps.ReadWrite.All`
   - `User.Read.All`
   - `Directory.Read.All`
5. Accorder le **consentement administrateur**

## ⚙️ Installation

### 1. Configurer les identifiants Azure AD

**⚠️ Sécurité :** Ne jamais committer de vrais secrets dans `appsettings.json`. En développement, utiliser [User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) : `dotnet user-secrets set "AzureAd:ClientSecret" "votre-secret"`.

Modifier `appsettings.json` (ou User Secrets) :

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "votre-tenant-id",
    "ClientId": "votre-client-id",
    "ClientSecret": "votre-client-secret"
  },
  "PrimaryAdmin": {
    "Email": "votre-email@votredomaine.com",
    "DisplayName": "Administrateur Principal"
  }
}
```

**Admin principal :** L’email doit être **exactement** celui utilisé pour se connecter (Azure AD, ex. `preferred_username`). Voir la section *Configurer l’admin principal* ci‑dessous.

### 2. Configurer l’accès de l’admin principal

Deux possibilités (au moins une requise) :

**A) Via `appsettings.json` (recommandé pour démarrer)**

```json
"PrimaryAdmin": {
  "Email": "admin@votredomaine.com",
  "DisplayName": "Administrateur Principal"
}
```

- L’email doit correspondre à celui de la connexion Azure AD (UPN ou email du compte).
- L’app injecte cet admin à la volée s’il n’existe pas déjà dans `users.json`.

**B) Via `Config/users.json`**

Dans `PrimaryAdmins`, ajouter ou modifier une entrée :

```json
"PrimaryAdmins": [
  {
    "Id": "1",
    "Email": "admin@votredomaine.com",
    "DisplayName": "Administrateur Principal",
    "AzureObjectId": "",
    "IsActive": true,
    "CreatedAt": "2025-01-01T00:00:00Z"
  }
]
```

- Plusieurs admins principaux possibles.
- `IsActive: false` désactive l’accès.

Après modification, redémarrer l’application (ou republier si déployée).

### 3. Build et Publish

```bash
# Restaurer les packages
dotnet restore

# Build
dotnet build

# Publish pour IIS
dotnet publish -c Release -o ./publish
```

### 4. Déployer sur IIS

1. Créer un nouveau site IIS (ou une application virtuelle)
2. Pointer le chemin physique vers le dossier `publish` (ou utiliser `deploy-iis.ps1`)
3. Configurer l'Application Pool :
   - Version .NET CLR: **No Managed Code**
   - Pipeline mode: **Integrated**
4. Exécuter le script de déploiement (optionnel mais recommandé) :

```powershell
.\deploy-iis.ps1 -Source ".\publish" -Target "C:\inetpub\wwwroot\IntuneWksManager"
```

### 5. Permissions sur les fichiers

Le dossier `Config` doit être en écriture pour IIS. Le script `deploy-iis.ps1` configure `Config` et `logs` automatiquement. Sinon :

```powershell
icacls "C:\inetpub\wwwroot\IntuneWksManager\Config" /grant "IIS_IUSRS:(OI)(CI)M"
icacls "C:\inetpub\wwwroot\IntuneWksManager\logs" /grant "IIS_IUSRS:(OI)(CI)F"
```

### 6. Redirect URIs Azure AD (obligatoire)

Dans **Azure AD > App registrations > Votre app > Authentication**, ajouter les **Redirect URIs** **exactement** comme suit :

- Site à la racine : `https://votre-domaine.com/signin-oidc` et `https://votre-domaine.com`
- Application virtuelle (ex. `/IntuneWksManager`) : `https://votre-domaine.com/IntuneWksManager/signin-oidc` et `https://votre-domaine.com/IntuneWksManager`

Si les URIs ne correspondent pas, la connexion échouera.

## 📁 Structure des fichiers de configuration

```
Config/
├── users.json      # Utilisateurs et rôles RBAC
├── features.json   # Fonctionnalités et clients
├── settings.json   # Paramètres du portail
└── audit.json      # Journal d'audit
```

## 🔐 Rôles par défaut

| Rôle | Description |
|------|-------------|
| SuperAdmin | Accès complet à toutes les fonctionnalités |
| Admin | Administration des appareils et utilisateurs Intune |
| Operator | Opérations courantes sur les appareils |
| Viewer | Consultation uniquement |

## 🎨 Personnalisation

### Thème
Modifiable dans **Paramètres > Apparence**:
- Couleur principale
- Mode sombre

### Fonctionnalités
Activables/désactivables dans **Fonctionnalités**:
- Gestion des appareils (sync, redémarrage, effacement)
- Gestion des utilisateurs
- Applications
- Politiques
- Rapports

## 🔄 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/users | Liste des utilisateurs |
| POST | /api/users | Créer un utilisateur |
| PUT | /api/users/{id} | Modifier un utilisateur |
| DELETE | /api/users/{id} | Supprimer un utilisateur |
| GET | /api/roles | Liste des rôles |
| GET | /api/features | Liste des fonctionnalités |
| GET | /api/clients | Liste des clients |
| GET | /api/settings | Paramètres du portail |
| GET | /api/graph/devices | Appareils Intune |
| POST | /api/graph/devices/{id}/sync | Synchroniser un appareil |
| GET | /api/audit | Journal d'audit |

## 📝 Licence

Usage interne uniquement.

## 🔧 Dépannage

### AADSTS700054 : « response_type 'id_token' is not enabled for the application »

L’app utilise OpenID Connect et a besoin de **jetons d’ID**. Dans **Azure AD** :

1. **App registrations** > votre app > **Authentication**
2. Sous *Implicit grant and hybrid flows*, cocher **ID tokens (used for implicit and hybrid flows)**
3. **Enregistrer**

Si l’erreur persiste : désactiver puis réactiver l’option (cache), ou vérifier le manifeste (`oauth2AllowIdTokenImplicitFlow: true`).

### « Ça ne marche pas » après publication

1. **Consulter les logs stdout**  
   Les logs sont dans `publish\logs\`. Les fichiers `stdout_*.log` contiennent les erreurs de démarrage. Activer les logs est fait automatiquement à la publication.

2. **Vérifier les Redirect URIs Azure AD**  
   Ils doivent correspondre **exactement** à l’URL du site (voir §6 ci‑dessus). Erreur typique : `AADSTS50011: The reply URL specified in the request does not match`.

3. **Application dans un sous‑chemin (ex. `/IntuneWksManager`)**  
   Ajouter dans `appsettings.json` :
   ```json
   "PathBase": "/IntuneWksManager"
   ```

4. **HTTPS derrière IIS**  
   L’app utilise `ForwardedHeaders` (X-Forwarded-Proto, etc.). Si vous terminez le TLS dans IIS, cela devrait fonctionner. Sinon, vérifier que les en-têtes sont transmis.

5. **Erreurs détaillées (débogage)**  
   Dans le **Pool d’applications IIS** > **Configuration avancée** > **Variables d’environnement**, ajouter :
   - `ASPNETCORE_ENVIRONMENT` = `Development` (temporaire)
   - `ASPNETCORE_DETAILEDERRORS` = `true`

## 🆘 Support

Pour toute question ou problème, contactez l'équipe IT.
