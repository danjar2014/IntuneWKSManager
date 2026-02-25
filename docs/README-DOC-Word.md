# Documentation Word et schémas Visio — IntuneWksManager

Ce dossier contient les fichiers pour produire la **documentation technique au format Word** avec **schémas de type Visio**.

## Fichiers

| Fichier | Description |
|---------|-------------|
| **DOC-IntuneWksManager-Word.html** | Document principal. À ouvrir dans **Microsoft Word** puis enregistrer en **.docx** (Fichier → Ouvrir → sélectionner le .html ; Fichier → Enregistrer sous → Document Word). Contient : vue d’ensemble, base SQL sur l’instance MECM, connexion Admin/Opérateurs, RBAC, sauvegarde/restauration, clients, et spécifications Visio. |
| **Schemas-Mermaid.md** | Schémas au format **Mermaid**. Copier chaque bloc de code dans [mermaid.live](https://mermaid.live), exporter en PNG/SVG et insérer les images dans le document Word aux emplacements indiqués. |
| **Schemas-Visio-Specs.md** | **Spécifications détaillées** pour redessiner chaque schéma dans **Microsoft Visio** (formes, libellés, connecteurs, légendes). Exporter ensuite chaque page Visio en PNG/EMF et insérer dans le document Word. |

## Contenu du document Word

1. **Vue d’ensemble** — Objectif du portail, option SQL sur l’instance MECM.
2. **Base de données SQL sur l’instance MECM** — Principe (base distincte, table ConfigStore), configuration, note sur la création de la base.
3. **Connexion des utilisateurs (Admin / Opérateurs)** — Qui se connecte (PC + navigateur), parcours technique, schéma physique à insérer.
4. **Modèle RBAC** — Hiérarchie Admin principal / Opérateurs, rôles par défaut, permissions granulaires, schéma à insérer.
5. **Sauvegarde et restauration** — Contenu, format chiffré, clé de restauration (affichée une fois), flux création et restauration, schéma à insérer.
6. **Clients (multi-tenant)** — Définition des « clients » dans le portail et lien avec la connexion des utilisateurs, schéma à insérer.
7. **Spécifications pour schémas Visio** — Instructions pour dessiner chaque schéma dans Visio (formes, texte, flèches, légendes).

## Obtenir le document Word final avec schémas

**Option A — Schémas Mermaid**  
1. Ouvrir `DOC-IntuneWksManager-Word.html` dans Word, enregistrer en .docx.  
2. Pour chaque schéma dans `Schemas-Mermaid.md` : aller sur [mermaid.live](https://mermaid.live), coller le code, exporter en PNG.  
3. Dans Word, remplacer chaque zone « Insérer ici le schéma… » par l’image correspondante.

**Option B — Schémas Visio**  
1. Ouvrir `DOC-IntuneWksManager-Word.html` dans Word, enregistrer en .docx.  
2. Suivre `Schemas-Visio-Specs.md` pour dessiner chaque schéma dans Visio.  
3. Exporter chaque page Visio en PNG ou EMF (Fichier → Exporter).  
4. Dans Word, insérer les images aux emplacements prévus.

**Option C — Mixte**  
Utiliser Mermaid pour certains schémas et Visio pour d’autres selon votre préférence.

## Point important : SQL sur l’instance MECM

Le document précise que **la base de données du portail (IntuneWksManager) est installée sur l’instance SQL Server existante du serveur MECM**. Il s’agit d’une **base séparée** (nom par défaut : `IntuneWksManager`) avec une seule table `ConfigStore` ; les bases MECM ne sont pas modifiées.
