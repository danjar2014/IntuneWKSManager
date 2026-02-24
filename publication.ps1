cd C:\IntuneWksManager\IntuneWksManager

# Nettoyer
Remove-Item -Path .\publish-iis -Recurse -Force -ErrorAction SilentlyContinue

# Publier le projet (pas la solution) pour éviter NETSDK1194
dotnet publish IntuneWksManager.csproj -c Release -o ./publish-iis

# Copier vers IIS
Remove-Item -Path C:\inetpub\wwwroot\IntuneWksManager\* -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path .\publish-iis\* -Destination C:\inetpub\wwwroot\IntuneWksManager -Recurse -Force

# Permissions
mkdir C:\inetpub\wwwroot\IntuneWksManager\logs -Force
icacls "C:\inetpub\wwwroot\IntuneWksManager\logs" /grant "IIS_IUSRS:(OI)(CI)F"
icacls "C:\inetpub\wwwroot\IntuneWksManager\Config" /grant "IIS_IUSRS:(OI)(CI)F"

iisreset