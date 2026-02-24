# Script de verification COMPLETE du deploiement IntuneWksManager (IIS + fichiers + config + logs)
# Usage:
#   .\check-all.ps1
#   .\check-all.ps1 -SitePath "C:\inetpub\wwwroot\IntuneWksManager" -AppPoolName "IntuneWksManager"
#   .\check-all.ps1 -Report "C:\temp\diagnostic.txt"
#   .\check-all.ps1 -FixWebConfig   # Corrige hostingModel inprocess -> outofprocess si besoin

param(
    [string]$SitePath = "C:\inetpub\wwwroot\IntuneWksManager",
    [string]$AppPoolName = "IntuneWksManager",
    [string]$Report = "",       # Si renseigne, ecrit un rapport texte en plus de la console
    [switch]$FixWebConfig       # Applique la correction web.config (inprocess -> outofprocess) si detecte
)

$ErrorActionPreference = "Stop"
$issues = 0
$warnings = 0
$reportLines = [System.Collections.ArrayList]::new()

function Out-Line {
    param([string]$msg, [string]$level = "Info")  # Info | Ok | Warn | Fail
    $color = "Gray"
    if ($level -eq "Ok") { $color = "Green" }
    elseif ($level -eq "Warn") { $color = "Yellow"; $script:warnings++ }
    elseif ($level -eq "Fail") { $color = "Red"; $script:issues++ }
    Write-Host "  $msg" -ForegroundColor $color
    $prefix = switch ($level) { "Ok" { "[OK] " } "Warn" { "[ATTENTION] " } "Fail" { "[ERREUR] " } default { "" } }
    [void]$reportLines.Add("$prefix$msg")
}

function Out-Header {
    param([string]$title)
    Write-Host "`n--- $title ---" -ForegroundColor White
    [void]$reportLines.Add(""); [void]$reportLines.Add("--- $title ---")
}

# --- Demarrage ---
Write-Host "`n========== VERIFICATION COMPLETE IntuneWksManager ==========" -ForegroundColor Cyan
[void]$reportLines.Add("VERIFICATION COMPLETE IntuneWksManager - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$reportLines.Add("SitePath: $SitePath | AppPool: $AppPoolName")
Out-Line "Dossier site: $SitePath" "Info"

# ========== 1. .NET ==========
Out-Header "1. .NET"
$dotnetExe = $null
try { $dotnetExe = (Get-Command dotnet -ErrorAction SilentlyContinue).Source } catch {}
if ($dotnetExe) {
    Out-Line "dotnet trouve: $dotnetExe" "Ok"
    try {
        $ver = & dotnet --version 2>&1
        Out-Line "Version: $ver" "Ok"
    } catch { Out-Line "dotnet --version echoue: $_" "Fail" }
    $runtimes = & dotnet --list-runtimes 2>&1 | Out-String
    if ($runtimes -match "Microsoft\.AspNetCore\.App 8\.0") { Out-Line "ASP.NET Core 8.0 present" "Ok" }
    else { Out-Line "ASP.NET Core 8.0 absent. Installer Hosting Bundle .NET 8." "Fail" }
    if ($runtimes -match "Microsoft\.NETCore\.App 8\.0") { Out-Line ".NET Core Runtime 8.0 present" "Ok" }
    else { Out-Line ".NET Core 8.0 Runtime absent" "Fail" }
} else {
    $probe = @("$env:ProgramFiles\dotnet\dotnet.exe", "${env:ProgramFiles(x86)}\dotnet\dotnet.exe")
    $found = $false
    foreach ($p in $probe) {
        if (Test-Path $p) {
            Out-Line "dotnet.exe trouve (hors PATH): $p" "Ok"
            $dotnetExe = $p
            $found = $true
            break
        }
    }
    if (-not $found) { Out-Line "dotnet non trouve. Installer ASP.NET Core 8.0 Hosting Bundle." "Fail" }
}

# ========== 2. Dossier du site et fichiers obligatoires ==========
Out-Header "2. Dossier du site et fichiers"
if (Test-Path $SitePath) { Out-Line "Dossier existe: $SitePath" "Ok" }
else { Out-Line "Dossier inexistant: $SitePath" "Fail" }

$requiredFiles = @(
    "IntuneWksManager.dll",
    "web.config",
    "appsettings.json"
)
$optionalFiles = @("IntuneWksManager.deps.json", "IntuneWksManager.runtimeconfig.json")
foreach ($f in $requiredFiles) {
    $fp = Join-Path $SitePath $f
    if (Test-Path $fp) { Out-Line "$f present" "Ok" } else { Out-Line "$f ABSENT" "Fail" }
}
foreach ($f in $optionalFiles) {
    $fp = Join-Path $SitePath $f
    if (Test-Path $fp) { Out-Line "$f present" "Ok" } else { Out-Line "$f absent (optionnel)" "Info" }
}
$configDir = Join-Path $SitePath "Config"
$logsDir = Join-Path $SitePath "logs"
$wwwroot = Join-Path $SitePath "wwwroot"
if (Test-Path $configDir) { Out-Line "Config\ existe" "Ok" } else { Out-Line "Config\ absent (sera cree au 1er run)" "Warn" }
if (Test-Path $logsDir) { Out-Line "logs\ existe" "Ok" } else { Out-Line "logs\ absent; creer: New-Item -ItemType Directory -Path '$logsDir' -Force" "Warn" }
if (Test-Path $wwwroot) { Out-Line "wwwroot\ existe" "Ok" } else { Out-Line "wwwroot\ absent" "Fail" }

# ========== 3. web.config ==========
Out-Header "3. web.config"
$webConfigPath = Join-Path $SitePath "web.config"
if (Test-Path $webConfigPath) {
    $wc = Get-Content $webConfigPath -Raw -Encoding UTF8
    if ($wc -match 'AspNetCoreModuleV2') { Out-Line "Handler AspNetCoreModuleV2 present" "Ok" } else { Out-Line "AspNetCoreModuleV2 absent" "Fail" }
    if ($wc -match 'processPath="dotnet"') { Out-Line "processPath=dotnet" "Ok" } else { Out-Line "processPath non conforme" "Warn" }
    if ($wc -match 'arguments="[^"]*IntuneWksManager\.dll"') { Out-Line "arguments pointe vers IntuneWksManager.dll" "Ok" } else { Out-Line "arguments doit contenir .\IntuneWksManager.dll" "Fail" }
    if ($wc -match 'hostingModel="outofprocess"') {
        Out-Line "hostingModel=outofprocess (correct)" "Ok"
    } elseif ($wc -match 'hostingModel="inprocess"') {
        Out-Line "hostingModel=inprocess avec processPath=dotnet => erreur 0x8007000d. Remplacer par outofprocess." "Fail"
        if ($FixWebConfig) {
            $backup = $webConfigPath + ".bak." + (Get-Date -Format "yyyyMMddHHmmss")
            Set-Content -Path $backup -Value $wc -Encoding UTF8 -NoNewline:$false
            $fixed = $wc -replace 'hostingModel="inprocess"', 'hostingModel="outofprocess"'
            Set-Content -Path $webConfigPath -Value $fixed -Encoding UTF8 -NoNewline:$false
            Out-Line "web.config corrige. Backup: $backup" "Ok"
        }
    } else { Out-Line "hostingModel non trouve ou invalide" "Warn" }
    if ($wc -match 'stdoutLogEnabled="true"') { Out-Line "stdoutLogEnabled=true" "Ok" } else { Out-Line "stdoutLogEnabled=false (logs desactives)" "Warn" }
    $stdoutPath = if ($wc -match 'stdoutLogFile="([^"]+)"') { Join-Path $SitePath $Matches[1].TrimStart(".\") } else { $logsDir }
} else {
    Out-Line "web.config absent" "Fail"
    $stdoutPath = $logsDir
}

# ========== 4. appsettings.json ==========
Out-Header "4. appsettings.json"
$appsettingsPath = Join-Path $SitePath "appsettings.json"
if (Test-Path $appsettingsPath) {
    try {
        $json = Get-Content $appsettingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
        Out-Line "Fichier JSON valide" "Ok"
        if ($json.PSObject.Properties.Name -contains "AzureAd") { Out-Line "Section AzureAd presente" "Ok" } else { Out-Line "Section AzureAd absente" "Warn" }
        if ($json.PSObject.Properties.Name -contains "PrimaryAdmin") { Out-Line "Section PrimaryAdmin presente" "Ok" } else { Out-Line "Section PrimaryAdmin absente" "Warn" }
        if ($json.AzureAd) {
            if (-not [string]::IsNullOrWhiteSpace($json.AzureAd.TenantId)) { Out-Line "AzureAd.TenantId renseigne" "Ok" } else { Out-Line "AzureAd.TenantId vide" "Warn" }
            if (-not [string]::IsNullOrWhiteSpace($json.AzureAd.ClientId)) { Out-Line "AzureAd.ClientId renseigne" "Ok" } else { Out-Line "AzureAd.ClientId vide" "Warn" }
        }
    } catch {
        Out-Line "appsettings.json invalide (JSON): $_" "Fail"
    }
} else {
    Out-Line "appsettings.json absent" "Warn"
}

# ========== 5. Module IIS ASP.NET Core ==========
Out-Header "5. Module IIS ASP.NET Core"
try {
    Import-Module WebAdministration -ErrorAction Stop
    $mod = Get-WebGlobalModule -Name "AspNetCoreModuleV2" -ErrorAction SilentlyContinue
    if ($mod) { Out-Line "AspNetCoreModuleV2 enregistre" "Ok" } else { Out-Line "AspNetCoreModuleV2 absent. Reinstaller Hosting Bundle .NET 8." "Fail" }
} catch {
    Out-Line "WebAdministration non disponible: $_" "Warn"
}

# ========== 6. Application Pool ==========
Out-Header "6. Application Pool"
try {
    $pool = Get-ChildItem "IIS:\AppPools" -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $AppPoolName }
    if ($pool) {
        Out-Line "App Pool existe: $AppPoolName" "Ok"
        $rt = $pool.managedRuntimeVersion
        if ([string]::IsNullOrEmpty($rt)) { Out-Line "managedRuntimeVersion vide (correct)" "Ok" } else { Out-Line "managedRuntimeVersion=$rt doit etre vide" "Fail" }
        if ($pool.state -eq "Started") { Out-Line "Pool demarre" "Ok" } else { Out-Line "Pool etat: $($pool.state)" "Warn" }
    } else {
        Out-Line "App Pool '$AppPoolName' absent." "Fail"
        Out-Line "Creer: New-WebAppPool -Name '$AppPoolName'; Set-ItemProperty 'IIS:\AppPools\$AppPoolName' -Name managedRuntimeVersion -Value ''" "Info"
    }
} catch { Out-Line "Verification pool: $_" "Warn" }

# ========== 7. Site / Application IIS ==========
Out-Header "7. Site ou Application IIS"
try {
    $site = Get-Website | Where-Object { $_.physicalPath -replace '\\$','' -eq $SitePath -replace '\\$','' }
    $app = Get-WebApplication -Site "Default Web Site" -ErrorAction SilentlyContinue | Where-Object { $_.physicalPath -replace '\\$','' -eq $SitePath -replace '\\$','' }
    if ($site) {
        Out-Line "Site: $($site.Name), chemin: $($site.physicalPath)" "Ok"
        if ($site.applicationPool -ne $AppPoolName) { Out-Line "Le site utilise le pool: $($site.applicationPool)" "Warn" }
    } elseif ($app) {
        Out-Line "Application: $($app.path), chemin: $($app.physicalPath)" "Ok"
    } else {
        Out-Line "Aucun site/application ne pointe vers $SitePath" "Fail"
    }
} catch { Out-Line "Verification site: $_" "Warn" }

# ========== 8. Permissions ==========
Out-Header "8. Permissions (IIS_IUSRS)"
try {
    $acl = Get-Acl $SitePath -ErrorAction SilentlyContinue
    $rules = $acl.Access | Where-Object { $_.IdentityReference -like "*IIS_IUSRS*" }
    if ($rules) { Out-Line "IIS_IUSRS a des droits sur le dossier site" "Ok" } else { Out-Line "Verifier droits IIS_IUSRS sur $SitePath" "Warn" }
    if (Test-Path $configDir) {
        $r = (Get-Acl $configDir).Access | Where-Object { $_.IdentityReference -like "*IIS_IUSRS*" }
        if ($r) { Out-Line "IIS_IUSRS sur Config\" "Ok" } else { Out-Line "Accorder Modify a IIS_IUSRS sur Config\" "Warn" }
    }
    if (Test-Path $logsDir) {
        $r = (Get-Acl $logsDir).Access | Where-Object { $_.IdentityReference -like "*IIS_IUSRS*" }
        if ($r) { Out-Line "IIS_IUSRS sur logs\" "Ok" } else { Out-Line "Accorder Full a IIS_IUSRS sur logs\" "Warn" }
    }
} catch { Out-Line "ACL: $_" "Warn" }

# ========== 9. Logs stdout (dernier fichier) ==========
Out-Header "9. Derniers logs stdout"
if (Test-Path $logsDir) {
    $stdoutFiles = Get-ChildItem -Path $logsDir -Filter "stdout_*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($stdoutFiles) {
        $last = $stdoutFiles[0]
        Out-Line "Dernier fichier: $($last.Name) ($(Get-Date $last.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss'))" "Ok"
        $lines = Get-Content $last.FullName -Tail 30 -ErrorAction SilentlyContinue
        if ($lines) {
            foreach ($l in $lines) {
                $isErr = $l -match "fail|error|exception|0x8007000d"
                Out-Line $l $(if ($isErr) { "Warn" } else { "Info" })
            }
        }
    } else { Out-Line "Aucun fichier stdout_*.log dans logs\" "Warn" }
} else { Out-Line "Dossier logs\ absent" "Warn" }

# ========== 10. Journal des evenements (erreurs IIS / ASP.NET) ==========
Out-Header "10. Journal des evenements (erreurs recentes)"
try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName = @("Application", "System")
        Level   = 2,3   # Error, Critical
        StartTime = (Get-Date).AddHours(-2)
    } -MaxEvents 10 -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -match "IIS|ASP\.NET|AspNetCore|0x8007000d|Ancm" }
    if ($events) {
        foreach ($e in $events) {
            Out-Line "[$($e.TimeCreated.ToString('HH:mm:ss'))] $($e.ProviderName): $($e.Message.Substring(0, [Math]::Min(120, $e.Message.Length)))..." "Warn"
        }
    } else { Out-Line "Aucune erreur IIS/ASP.NET dans les 2 dernieres heures" "Ok" }
} catch { Out-Line "Lecture Event Log: $_" "Warn" }

# ========== 11. Test demarrage rapide (optionnel) ==========
Out-Header "11. Test demarrage application (dotnet exec)"
if ($dotnetExe -and (Test-Path (Join-Path $SitePath "IntuneWksManager.dll"))) {
    try {
        $p = Start-Process -FilePath $dotnetExe -ArgumentList "exec", "`"$(Join-Path $SitePath "IntuneWksManager.dll")`"" -WorkingDirectory $SitePath -PassThru -NoNewWindow -RedirectStandardError "$env:TEMP\iischeck_stderr.txt" -RedirectStandardOutput "$env:TEMP\iischeck_stdout.txt"
        Start-Sleep -Seconds 3
        if (-not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            Out-Line "Processus demarre puis arrete (OK)" "Ok"
        } else {
            $err = Get-Content "$env:TEMP\iischeck_stderr.txt" -Raw -ErrorAction SilentlyContinue
            if ($err -match "error|fail|exception") { Out-Line "Sortie erreur au demarrage: $($err.Substring(0, [Math]::Min(200, $err.Length)))" "Warn" }
        }
    } catch { Out-Line "Test demarrage: $_" "Warn" }
} else { Out-Line "Test demarrage ignore (dotnet ou dll absent)" "Info" }

# ========== Resume ==========
Out-Header "RESUME"
if ($issues -eq 0 -and $warnings -eq 0) {
    Write-Host "  Aucun probleme detecte." -ForegroundColor Green
    [void]$reportLines.Add("[OK] Aucun probleme detecte.")
} else {
    Write-Host "  Erreurs: $issues | Avertissements: $warnings" -ForegroundColor $(if ($issues -gt 0) { "Red" } else { "Yellow" })
    [void]$reportLines.Add("Erreurs: $issues | Avertissements: $warnings")
}
Write-Host ""

# Rapport fichier
if (-not [string]::IsNullOrWhiteSpace($Report)) {
    $dir = Split-Path $Report -Parent
    if (-not [string]::IsNullOrEmpty($dir) -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $reportLines | Set-Content -Path $Report -Encoding UTF8
    Write-Host "Rapport enregistre: $Report" -ForegroundColor Cyan
}

# Suggérer correction web.config si pas de -FixWebConfig
if (-not $FixWebConfig -and (Test-Path $webConfigPath)) {
    $wc = Get-Content $webConfigPath -Raw -Encoding UTF8
    if ($wc -match 'hostingModel="inprocess"' -and $wc -match 'processPath="dotnet"') {
        Write-Host "Pour corriger automatiquement l'erreur 0x8007000d, relancer avec: -FixWebConfig" -ForegroundColor Yellow
    }
}

exit $(if ($issues -gt 0) { 1 } else { 0 })
