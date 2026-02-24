# Claude Web — Interface web pour Claude AI

Interface type chat, moderne et responsive, dans le navigateur.

## Lancement

1. **Double-clic** sur `Lancer Claude Web.bat`  
   → installe les dépendances si besoin, ouvre le navigateur sur http://localhost:3742 et démarre le serveur.

2. **Ou en ligne de commande :**
   ```bash
   cd ClaudeWeb
   npm install
   npm start
   ```
   Puis ouvrez http://localhost:3742 dans votre navigateur.

## Prérequis

- **Node.js** et **npm** installés
- **Claude CLI** disponible (commande `claude` dans le PATH)

## Fonctions

- Design type chat (bulles, avatars)
- **Mode sombre** par défaut, **mode clair** via le bouton en haut à droite
- Réponses Claude en **temps réel** (stream)
- Raccourci **Entrée** pour envoyer, **Shift+Entrée** pour un retour à la ligne
- Préférence de thème enregistrée dans le navigateur

## Port

Par défaut le serveur écoute sur le **port 3742**. Pour changer :

```bash
set PORT=3000
node server.js
```

## Commande Claude

Si la commande n’est pas `claude`, définir la variable d’environnement :

```bash
set CLAUDE_CMD=%APPDATA%\npm\claude.cmd
node server.js
```
