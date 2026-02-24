# Déploiement IIS pour IntuneWksManager
# Usage: .\deploy-iis.ps1 [-Source ".\publish"] [-Target "C:\inetpub\wwwroot\IntuneWksManager"]
# Exemple: .\deploy-iis.ps1 -Source ".\publish-iis" -Target "C:\inetpub\wwwroot\IntuneWksManager"

param(
    [string]$Source = ".\publish",
    [string]$Target = "C:\inetpub\wwwroot\IntuneWksManager"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Source)) { throw "Dossier source introuvable: $Source" }

Write-Host "Copie $Source -> $Target"
if (Test-Path $Target) { Remove-Item -Recurse -Force $Target }
New-Item -ItemType Directory -Path $Target -Force | Out-Null
Copy-Item -Path "$Source\*" -Destination $Target -Recurse -Force

$logsPath = Join-Path $Target "logs"
$configPath = Join-Path $Target "Config"
New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
icacls $logsPath /grant "IIS_IUSRS:(OI)(CI)F" | Out-Null
if (Test-Path $configPath) { icacls $configPath /grant "IIS_IUSRS:(OI)(CI)M" | Out-Null }

Write-Host "Redémarrage IIS..."
iisreset
Write-Host "Déploiement terminé."
