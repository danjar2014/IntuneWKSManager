# Schémas Mermaid pour IntuneWksManager

Exporter chaque bloc Mermaid en PNG ou SVG (ex. [mermaid.live](https://mermaid.live)) puis insérer les images dans le document Word à la place des zones « Schéma » du fichier `DOC-IntuneWksManager-Word.html`.

---

## Schéma 1 — Instance SQL MECM et base IntuneWksManager

```mermaid
flowchart LR
  subgraph IIS["Serveur IIS"]
    APP[Application IntuneWksManager]
  end

  subgraph SQL["Serveur SQL Server (instance MECM)"]
    MECM[(Bases MECM\nsite, etc.)]
    IWM[(Base IntuneWksManager\nTable ConfigStore)]
  end

  APP -->|"Connexion SQL\n(Windows ou SQL Auth)"| IWM
  APP -.->|"N'utilise pas"| MECM
```

**Légende à ajouter sous le schéma :** La base IntuneWksManager est une base distincte sur la même instance SQL que MECM.

---

## Schéma 2 — Connexion Admin / Opérateurs (PC → IIS → Entra ID / SQL / Graph)

```mermaid
flowchart TB
  subgraph User["Poste utilisateur"]
    PC[PC - Navigateur\nAdmin ou Opérateur]
  end

  subgraph Server["Serveur"]
    IIS[IIS\nIntuneWksManager]
  end

  subgraph Cloud["Services cloud / locaux"]
    ENTRA[Microsoft Entra ID\nlogin.microsoftonline.com]
    SQL[(SQL Server\ninstance MECM)]
    GRAPH[Microsoft Graph API\nappareils, users, apps]
  end

  PC -->|HTTPS| IIS
  IIS -->|"Redirect OIDC\nConnexion utilisateur"| ENTRA
  ENTRA -->|"Token / Redirect signin-oidc"| IIS
  IIS -->|"Config\n(Users, Settings, Audit)"| SQL
  IIS -->|"Client Credentials\nAppareils, Apps, Politiques"| GRAPH
```

**Légende :** Les utilisateurs se connectent depuis leur PC via le navigateur ; l'application s'authentifie auprès d'Entra ID et lit/écrit la config en SQL (ou JSON) et appelle Graph pour Intune.

---

## Schéma 3 — Modèle RBAC

```mermaid
flowchart TB
  PA[Administrateur principal\nAccès complet]
  SA[Administrateurs secondaires\nOpérateurs]

  subgraph Roles["Rôles"]
    R1[FullAdmin]
    R2[Operator]
    R3[Viewer]
    R4[Custom]
  end

  subgraph Perms["Permissions (exemples)"]
    P1[devices.read / sync / restart / wipe]
    P2[users.read]
    P3[apps.read / assign]
    P4[reports.read / compliance / export]
  end

  PA -.->|"Pas de rôle"| SA
  SA -->|Affectation| Roles
  R1 --> P1 & P2 & P3 & P4
  R2 --> P1 & P2 & P3
  R3 --> P1 & P2 & P3
```

**Légende :** Les opérateurs ont un rôle ; le rôle définit la liste des permissions qui déterminent les onglets et actions visibles dans l'interface Opérateur.

---

## Schéma 4 — Flux Sauvegarde et Restauration

```mermaid
flowchart TB
  subgraph Backup["Sauvegarde"]
    A1[Admin clique Sauvegarder]
    A2[Agrégation Config\nJSON ou SQL]
    A3[Chiffrement AES\nclé unique générée]
    A4[Fichier .bin]
    A5[Clé de restauration\naffichée 1 seule fois]
    A1 --> A2 --> A3 --> A4
    A3 --> A5
  end

  subgraph Restore["Restauration"]
    B1[Admin choisit fichier\n+ colle la clé]
    B2[Déchiffrement]
    B3[Mise à jour storage.json]
    B4[Écriture Config\nJSON ou SQL]
    B1 --> B2 --> B3 --> B4
  end
```

**Légende :** La clé de restauration n'est pas dans le fichier ; elle doit être conservée par l'admin pour toute restauration future.

---

## Schéma 5 — Clients multi-tenant et connexion

```mermaid
flowchart TB
  PC[PC - Navigateur\nAdmin / Opérateur]
  IIS[IIS\nIntuneWksManager]
  ENTRA[Entra ID]
  SQL[(SQL / Config\nUsers, Features, Settings)]
  GRAPH[Graph API]

  subgraph Config["Configuration portail"]
    CLIENTS[Clients multi-tenant\nNom, TenantId, Fonctionnalités]
  end

  PC --> IIS
  IIS --> ENTRA
  IIS --> SQL
  IIS --> GRAPH
  SQL --> CLIENTS
```

**Légende :** La liste des clients (entités organisation) et leurs fonctionnalités est stockée dans la config (JSON ou ConfigStore) et lue par l'application au démarrage / à la demande.
