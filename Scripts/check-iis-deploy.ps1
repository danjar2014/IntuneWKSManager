# Script de verification du deploiement IntuneWksManager sous IIS
# Usage: .\check-iis-deploy.ps1 [-SitePath "C:\inetpub\wwwroot\IntuneWksManager"] [-AppPoolName "IntuneWksManager"]

param(
    [string]$SitePath = "C:\inetpub\wwwroot\IntuneWksManager",
    [string]$AppPoolName = "IntuneWksManager"
)

$ErrorActionPreference = "Stop"
$issues = 0
$warnings = 0

function Write-Ok { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  [ERREUR] $msg" -ForegroundColor Red; $script:issues++ }
function Write-Warn { param($msg) Write-Host "  [ATTENTION] $msg" -ForegroundColor Yellow; $script:warnings++ }
function Write-Info { param($msg) Write-Host "  $msg" -ForegroundColor Gray }

Write-Host "`n========== Verification deploiement IntuneWksManager ==========" -ForegroundColor Cyan
Write-Host "Dossier site: $SitePath" -ForegroundColor Cyan
Write-Host ""

# ---- 1. .NET ----
Write-Host "--- 1. .NET ---" -ForegroundColor White
$dotnetExe = $null
try {
    $dotnetExe = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
} catch {}
if ($dotnetExe) {
    Write-Ok "dotnet trouve: $dotnetExe"
    try {
        $ver = & dotnet --version 2>&1
        Write-Ok "Version SDK/runtime: $ver"
    } catch { Write-Fail "dotnet --version echoue: $_" }
    $runtimes = & dotnet --list-runtimes 2>&1
    if ($runtimes -match "Microsoft\.AspNetCore\.App 8\.0") {
        Write-Ok "ASP.NET Core 8.0 present"
    } else {
        Write-Fail "ASP.NET Core 8.0 absent. Installer Hosting Bundle .NET 8."
        Write-Info "https://dotnet.microsoft.com/download/dotnet/8.0"
    }
    if ($runtimes -match "Microsoft\.NETCore\.App 8\.0") {
        Write-Ok ".NET Core Runtime 8.0 present"
    } else {
        Write-Fail ".NET Core 8.0 Runtime absent"
    }
} else {
    $probe = @("$env:ProgramFiles\dotnet\dotnet.exe", "${env:ProgramFiles(x86)}\dotnet\dotnet.exe")
    $found = $false
    foreach ($p in $probe) {
        if (Test-Path $p) {
            Write-Ok "dotnet.exe trouve hors PATH: $p"
            $dotnetExe = $p
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Fail "dotnet non trouve. Installer ASP.NET Core 8.0 Hosting Bundle et redemarrer le serveur."
    }
}
Write-Host ""

# ---- 2. Dossier du site ----
Write-Host "--- 2. Dossier du site ---" -ForegroundColor White
if (Test-Path $SitePath) {
    Write-Ok "Dossier existe: $SitePath"
} else {
    Write-Fail "Dossier inexistant: $SitePath"
    Write-Host "  Creer le dossier et copier le contenu de publish-iis."
}
$dllPath = Join-Path $SitePath "IntuneWksManager.dll"
$exePath = Join-Path $SitePath "IntuneWksManager.exe"
if (Test-Path $dllPath) { Write-Ok "IntuneWksManager.dll present" } else { Write-Fail "IntuneWksManager.dll absent" }
if (Test-Path (Join-Path $SitePath "web.config")) { Write-Ok "web.config present" } else { Write-Fail "web.config absent" }
if (Test-Path (Join-Path $SitePath "appsettings.json")) { Write-Ok "appsettings.json present" } else { Write-Warn "appsettings.json absent" }
$configDir = Join-Path $SitePath "Config"
if (Test-Path $configDir) { Write-Ok "Config\ existe" } else { Write-Warn "Config\ absent (sera cree au 1er run)" }
$logsDir = Join-Path $SitePath "logs"
if (Test-Path $logsDir) { Write-Ok "logs\ existe" } else { Write-Warn "logs\ absent"; Write-Info "Creation: New-Item -ItemType Directory -Path '$logsDir' -Force" }
$wwwroot = Join-Path $SitePath "wwwroot"
if (Test-Path $wwwroot) { Write-Ok "wwwroot\ existe" } else { Write-Fail "wwwroot\ absent" }
Write-Host ""

# ---- 3. web.config ---
Write-Host "--- 3. web.config ---" -ForegroundColor White
$webConfigPath = Join-Path $SitePath "web.config"
if (Test-Path $webConfigPath) {
    $wc = Get-Content $webConfigPath -Raw -Encoding UTF8
    if ($wc -match 'AspNetCoreModuleV2') { Write-Ok "Handler AspNetCoreModuleV2 present" } else { Write-Fail "Handler AspNetCoreModuleV2 absent" }
    if ($wc -match 'processPath="dotnet"') { Write-Ok "processPath=dotnet" } else { Write-Info "processPath: $(if ($wc -match 'processPath="([^"]+)"') { $Matches[1] } else { 'non trouve' })" }
    if ($wc -match 'arguments="[^"]*IntuneWksManager\.dll"') { Write-Ok "arguments pointe vers .dll" } else { Write-Fail "arguments doit contenir .\IntuneWksManager.dll" }
    if ($wc -match 'hostingModel="outofprocess"') {
        Write-Ok "hostingModel=outofprocess (correct avec processPath=dotnet)"
    } elseif ($wc -match 'hostingModel="inprocess"') {
        Write-Fail "hostingModel=inprocess avec processPath=dotnet provoque 0x8007000d. Remplacer par outofprocess."
        Write-Info "Dans web.config, remplacer: hostingModel=`"inprocess`" par hostingModel=`"outofprocess`""
    } else {
        Write-Warn "hostingModel non trouve ou invalide"
    }
    if ($wc -match 'stdoutLogEnabled="true"') { Write-Ok "stdoutLogEnabled=true" } else { Write-Warn "stdoutLogEnabled=false (logs desactive)" }
} else {
    Write-Fail "web.config absent"
}
Write-Host ""

# ---- 4. IIS Module ASP.NET Core ----
Write-Host "--- 4. Module IIS ASP.NET Core ---" -ForegroundColor White
try {
    Import-Module WebAdministration -ErrorAction Stop
    $mod = Get-WebGlobalModule -Name "AspNetCoreModuleV2" -ErrorAction SilentlyContinue
    if ($mod) { Write-Ok "AspNetCoreModuleV2 enregistre" } else { Write-Fail "AspNetCoreModuleV2 absent. Reinstaller Hosting Bundle .NET 8 et redemarrer IIS." }
} catch {
    Write-Warn "Impossible de charger WebAdministration: $_"
    Write-Info "Verifier que le role IIS est installe."
}
Write-Host ""

# ---- 5. Application Pool ----
Write-Host "--- 5. Application Pool ---" -ForegroundColor White
try {
    $pool = Get-ChildItem "IIS:\AppPools" -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $AppPoolName }
    if ($pool) {
        Write-Ok "App Pool existe: $AppPoolName"
        $rt = $pool.managedRuntimeVersion
        if ([string]::IsNullOrEmpty($rt)) { Write-Ok "managedRuntimeVersion vide (correct pour ASP.NET Core)" } else { Write-Fail "managedRuntimeVersion=$rt doit etre vide pour ASP.NET Core" }
        $state = $pool.state
        if ($state -eq "Started") { Write-Ok "Pool demarre" } else { Write-Warn "Pool etat: $state" }
    } else {
        Write-Fail "App Pool '$AppPoolName' absent."
        Write-Info "Creer: New-WebAppPool -Name '$AppPoolName'; Set-ItemProperty 'IIS:\AppPools\$AppPoolName' -Name managedRuntimeVersion -Value ''"
    }
} catch {
    Write-Warn "Impossible de verifier le pool: $_"
}
Write-Host ""

# ---- 6. Site / Application ----
Write-Host "--- 6. Site ou Application IIS ---" -ForegroundColor White
try {
    $site = Get-Website | Where-Object { $_.physicalPath -eq $SitePath -or $_.physicalPath -eq (Join-Path $SitePath "\") }
    $app = Get-WebApplication -Site "Default Web Site" -ErrorAction SilentlyContinue | Where-Object { $_.physicalPath -eq $SitePath }
    if ($site) {
        Write-Ok "Site trouve: $($site.Name), chemin: $($site.physicalPath)"
        if ($site.applicationPool -ne $AppPoolName) { Write-Warn "Le site utilise le pool: $($site.applicationPool), pas $AppPoolName" }
    } elseif ($app) {
        Write-Ok "Application trouvee: $($app.path), chemin: $($app.physicalPath)"
    } else {
        Write-Fail "Aucun site ni application ne pointe vers $SitePath"
        Write-Info "Creer un site ou une application virtuelle pointant vers ce dossier, avec le pool $AppPoolName"
    }
} catch {
    Write-Warn "Verification site: $_"
}
Write-Host ""

# ---- 7. Permissions ----
Write-Host "--- 7. Permissions (IIS_IUSRS) ---" -ForegroundColor White
$aci = $null
try {
    $acl = Get-Acl $SitePath -ErrorAction SilentlyContinue
    $rules = $acl.Access | Where-Object { $_.IdentityReference -like "*IIS_IUSRS*" -or $_.IdentityReference -like "*IIS_IUSRS*" }
    if ($rules) { Write-Ok "IIS_IUSRS a des droits sur le dossier site" } else { Write-Warn "Verifier que IIS_IUSRS peut lire $SitePath" }
    if (Test-Path $configDir) {
        $aclConfig = Get-Acl $configDir -ErrorAction SilentlyContinue
        $r = $aclConfig.Access | Where-Object { $_.IdentityReference -like "*IIS_IUSRS*" }
        if ($r) { Write-Ok "IIS_IUSRS a des droits sur Config\" } else { Write-Warn "Accorder Modify a IIS_IUSRS sur Config\" }
    }
    if (Test-Path $logsDir) {
        $aclLogs = Get-Acl $logsDir -ErrorAction SilentlyContinue
        $r = $aclLogs.Access | Where-Object { $_.IdentityReference -like "*IIS_IUSRS*" }
        if ($r) { Write-Ok "IIS_IUSRS a des droits sur logs\" } else { Write-Warn "Accorder Full a IIS_IUSRS sur logs\" }
    }
} catch {
    Write-Warn "Verification ACL: $_"
}
Write-Host ""

# ---- 8. Resumé et correction web.config ----
Write-Host "========== Resume ==========" -ForegroundColor Cyan
if ($issues -eq 0 -and $warnings -eq 0) {
    Write-Host "Aucun probleme detecte." -ForegroundColor Green
} else {
    Write-Host "Erreurs: $issues | Avertissements: $warnings" -ForegroundColor $(if ($issues -gt 0) { "Red" } else { "Yellow" })
}

# Proposition de correction web.config si hostingModel=inprocess
if (Test-Path $webConfigPath) {
    $wc = Get-Content $webConfigPath -Raw -Encoding UTF8
    if ($wc -match 'hostingModel="inprocess"' -and $wc -match 'processPath="dotnet"') {
        Write-Host "`n--- Correction possible pour 0x8007000d ---" -ForegroundColor Yellow
        $fixed = $wc -replace 'hostingModel="inprocess"', 'hostingModel="outofprocess"'
        $backup = $webConfigPath + ".bak." + (Get-Date -Format "yyyyMMddHHmmss")
        Set-Content -Path $backup -Value $wc -Encoding UTF8
        Set-Content -Path $webConfigPath -Value $fixed -Encoding UTF8 -NoNewline:$false
        Write-Host "  web.config corrige (hostingModel=outofprocess). Backup: $backup" -ForegroundColor Green
        Write-Host "  Redemarrer le pool ou IIS: iisreset" -ForegroundColor Gray
    }
}

Write-Host ""
