# Claude GUI — Interface graphique pour Claude AI

Remplace la console PowerShell par une fenêtre graphique (WPF) avec thème sombre/clair.

## Lancement

- **Double-clic** sur `Lancer Claude GUI.bat`
- Ou dans PowerShell : `.\ClaudeGUI.ps1`

## Prérequis

- Windows 10/11
- PowerShell 5.1 ou plus
- Claude CLI installé et disponible dans le PATH (commande `claude`)

## Fonctions

- **Mode sombre** par défaut (style Catppuccin)
- **Mode clair** : bouton « Mode clair » / « Mode sombre » en haut
- Zone de conversation + champ de saisie en bas
- **Entrée** ou bouton **Envoyer** pour envoyer le message à Claude
- Réponses de Claude affichées en direct dans la fenêtre

## Personnalisation

En haut du script `ClaudeGUI.ps1`, vous pouvez modifier :

```powershell
$script:ClaudeCommand = "claude"   # ou chemin complet vers l’exécutable Claude
```

## Dépannage

- **« Erreur au démarrage de Claude »** : vérifiez que `claude` est bien dans le PATH (ouvrez une nouvelle console et tapez `claude --version`).
- Si Claude est installé via npm : le chemin peut être dans `%APPDATA%\npm\claude.cmd` ; vous pouvez mettre `$script:ClaudeCommand = "$env:APPDATA\npm\claude.cmd"` si besoin.
