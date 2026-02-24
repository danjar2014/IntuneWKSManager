# Compilation de la solution.
# Usage: .\build.ps1 [-Configuration Release] [-OutputPath dossier]
# Si vous devez spécifier un dossier de sortie, utilisez -OutputPath (pas --output) pour éviter NETSDK1194.
param([string]$Configuration = "Debug", [string]$OutputPath = "")
Set-Location $PSScriptRoot
if ($OutputPath) { dotnet build IntuneWksManager.sln -c $Configuration -p:OutputPath=$OutputPath } else { dotnet build IntuneWksManager.sln -c $Configuration }
