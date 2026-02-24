param([string]$PublishDir)
$ErrorActionPreference = "Stop"
$PublishDir = $PublishDir.Trim().TrimEnd('\').Trim('"')
$webConfig = Join-Path $PublishDir "web.config"
if (-not (Test-Path $webConfig)) { exit 0 }
$content = [System.IO.File]::ReadAllText($webConfig)
$content = $content -replace 'stdoutLogEnabled="false"', 'stdoutLogEnabled="true"'
# Inprocess + processPath="dotnet" provoque 0x8007000d sur IIS : utiliser outofprocess
$content = $content -replace 'hostingModel="inprocess"', 'hostingModel="outofprocess"'
[System.IO.File]::WriteAllText($webConfig, $content)
$logsDir = Join-Path $PublishDir "logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }
