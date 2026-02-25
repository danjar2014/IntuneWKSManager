# Spécifications détaillées pour schémas Visio — IntuneWksManager

Utilisez ce document pour reproduire les schémas dans Microsoft Visio. Chaque section décrit les formes, le texte et les connecteurs à utiliser. Vous pouvez ensuite exporter chaque page Visio en PNG ou EMF et l’insérer dans le document Word.

---

## 1. Schéma — Instance SQL MECM et base IntuneWksManager

**Objectif :** Montrer que la base IntuneWksManager est hébergée sur le même serveur SQL que MECM.

### Formes à créer

| Forme | Type Visio suggéré | Texte / Libellé |
|-------|--------------------|------------------|
| Serveur SQL | Serveur (forme réseau) ou rectangle | **Serveur SQL Server (instance MECM)** |
| Base 1 | Base de données (cylindre) ou rectangle | **Bases MECM** (site, bases de données de site) |
| Base 2 | Base de données (cylindre) ou rectangle | **Base IntuneWksManager** — Table **ConfigStore** |
| Application | Poste de travail ou rectangle | **Application IntuneWksManager (IIS)** |

### Disposition

- Au centre : le **Serveur SQL Server (instance MECM)**.
- À l’intérieur ou accolés à ce serveur : les deux bases (**Bases MECM** et **Base IntuneWksManager**).
- À gauche : **Application IntuneWksManager (IIS)**.

### Connecteurs

- **Application IntuneWksManager** → **Serveur SQL Server** : flèche avec libellé **« Connexion SQL (Windows ou SQL Auth) — Base IntuneWksManager »**.
- Optionnel : une flèche en pointillés de l’application vers « Bases MECM » avec le libellé **« N’utilise pas »** pour bien montrer la séparation.

### Légende sous le schéma

*« La base IntuneWksManager est une base distincte sur la même instance SQL que MECM. Elle contient une seule table ConfigStore (clé/valeur JSON). »*

---

## 2. Schéma — Connexion Admin / Opérateurs (PC, serveur, cloud)

**Objectif :** Illustrer le parcours de l’utilisateur (PC) vers le portail (IIS) puis vers Entra ID, SQL et Graph.

### Formes à créer

| Forme | Type Visio suggéré | Texte / Libellé |
|-------|--------------------|------------------|
| Poste client | PC / poste de travail | **PC utilisateur** — Navigateur (Admin ou Opérateur) |
| Serveur web | Serveur | **Serveur IIS** — Application **IntuneWksManager** |
| Cloud 1 | Nuage ou rectangle | **Microsoft Entra ID** (login.microsoftonline.com) |
| Cloud 2 | Base de données ou rectangle | **SQL Server (instance MECM)** — Config |
| Cloud 3 | Nuage ou rectangle | **Microsoft Graph API** (appareils, users, apps, politiques) |

### Disposition

- **Gauche :** PC utilisateur.
- **Centre :** Serveur IIS (IntuneWksManager).
- **Droite (ou en haut) :** trois blocs côte à côte ou empilés — Entra ID, SQL Server, Graph API.

### Connecteurs et libellés

| De | Vers | Libellé du connecteur |
|----|------|------------------------|
| PC utilisateur | Serveur IIS | **HTTPS** — Accès au portail |
| Serveur IIS | Entra ID | **Redirect OIDC** — Connexion utilisateur |
| Entra ID | Serveur IIS | **Token / signin-oidc** — Retour après authentification |
| Serveur IIS | SQL Server | **Config** — Users, Settings, Audit (lecture/écriture) |
| Serveur IIS | Graph API | **Client Credentials** — Appareils, Utilisateurs, Apps, Politiques |

### Légende sous le schéma

*« Les utilisateurs (Admin et Opérateurs) se connectent depuis leur PC via le navigateur. L’application s’authentifie auprès d’Entra ID, lit/écrit la configuration en SQL (ou JSON) et appelle Microsoft Graph pour les données Intune. »*

---

## 3. Schéma — Modèle RBAC (rôles et permissions)

**Objectif :** Représenter la hiérarchie Administrateur principal / Opérateurs, rôles et permissions.

### Formes à créer

| Forme | Texte / Libellé |
|-------|------------------|
| Rectangle (haut) | **Administrateur principal** — Accès complet (configuration, utilisateurs, Graph, audit, sauvegarde) |
| Rectangle (niveau 2) | **Administrateurs secondaires (Opérateurs)** |
| 4 rectangles (niveau 3) | **Rôle FullAdmin** — **Rôle Operator** — **Rôle Viewer** — **Rôle Custom** |
| Groupe de lignes de texte ou tableau | **Permissions :** devices.read, devices.sync, devices.restart, devices.wipe, users.read, apps.read, policies.read, reports.read, reports.export, etc. |

### Disposition

- En haut : **Administrateur principal** (éventuellement avec une flèche « pas de rôle / accès total »).
- En dessous : **Administrateurs secondaires**.
- Sous les opérateurs : les quatre **Rôles** (FullAdmin, Operator, Viewer, Custom) reliés par des flèches « Affectation ».
- Sous les rôles : une zone **Permissions** (liste ou bulles) avec des flèches « Contient » ou « Donne accès à ».

### Connecteurs

- Administrateur secondaire → Rôle : **« Affectation du rôle »**.
- Rôle → Permissions : **« Contient »** ou **« Donne accès à »** (ex. Operator → devices.read, devices.sync, users.read, reports.*).

### Légende sous le schéma

*« Les opérateurs ont un rôle. Le rôle définit la liste des permissions qui déterminent les onglets et actions visibles dans l’interface Opérateur. »*

---

## 4. Schéma — Sauvegarde et Restauration

**Objectif :** Montrer le flux de création de sauvegarde et de restauration avec la clé unique.

### Partie « Sauvegarde »

| Étape | Forme | Libellé |
|-------|--------|---------|
| 1 | Rectangle | **Admin** — Clic « Sauvegarder » |
| 2 | Rectangle | **Agrégation Config** (JSON ou SQL) — Users, Features, Settings, Audit, AzureAd, Storage |
| 3 | Rectangle | **Chiffrement AES** — Clé unique générée (32 octets) |
| 4a | Rectangle | **Fichier .bin** — Téléchargé (en-tête IWMBACKUP + contenu chiffré) |
| 4b | Rectangle | **Clé de restauration** — Affichée une seule fois (Base64) |

Flèches : 1 → 2 → 3 → 4a ; 3 → 4b.

### Partie « Restauration »

| Étape | Forme | Libellé |
|-------|--------|---------|
| 1 | Rectangle | **Admin** — Choix du fichier + saisie de la **clé de restauration** |
| 2 | Rectangle | **Déchiffrement** — Vérification clé |
| 3 | Rectangle | **Mise à jour storage.json** — Mode JSON ou SQL |
| 4 | Rectangle | **Écriture Config** — Fichiers JSON ou table ConfigStore (SQL) |

Flèches : 1 → 2 → 3 → 4.

### Légende sous le schéma

*« La clé de restauration n’est pas stockée dans le fichier. Elle doit être conservée en lieu sûr par l’administrateur pour toute restauration future. »*

---

## 5. Schéma — Clients multi-tenant et connexion utilisateurs

**Objectif :** Réutiliser le schéma de connexion (PC → IIS → Entra ID / SQL / Graph) et ajouter la notion de « clients » (entités organisation) dans la configuration.

### Formes (reprendre le schéma 2)

- PC utilisateur, Serveur IIS, Entra ID, SQL Server, Graph API (comme en section 2).

### Ajout « Configuration portail »

- Un bloc **Configuration portail** relié au **Serveur IIS** ou au **SQL / Config** :
  - **Clients (multi-tenant)** : Nom, TenantId, Fonctionnalités activées — stockés dans Config (Features) ou ConfigStore.

### Connecteur supplémentaire

- **IIS** ou **SQL/Config** → **Clients (multi-tenant)** : **« Lecture config »** — Liste des clients et droits.

### Légende sous le schéma

*« La liste des clients (entités organisation) et leurs fonctionnalités est stockée dans la configuration (JSON ou SQL) et lue par l’application. Les utilisateurs se connectent comme dans le schéma 2. »*

---

## Export vers Word

1. Dans Visio : créer une page par schéma (ou un fichier par schéma).
2. **Fichier → Exporter → Fichier PNG** (ou **EMF** pour meilleure qualité dans Word).
3. Ouvrir le document Word (enregistré à partir de `DOC-IntuneWksManager-Word.html`).
4. Remplacer chaque zone « Insérer ici le schéma… » par l’image exportée (Insertion → Images → À partir du fichier).
5. Ajuster la taille et la position de l’image, puis enregistrer le document.
