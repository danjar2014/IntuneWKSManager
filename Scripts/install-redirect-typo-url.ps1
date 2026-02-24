# Ajoute une redirection IIS pour l'URL erronée intunewksmanagerdmin -> intunewksmanager/Admin
# À exécuter une fois en administrateur. Modifie le web.config du Site par defaut (inetpub\wwwroot).
# Pre-requis : role "URL Rewrite" installe dans IIS (https://www.iis.net/downloads/microsoft/url-rewrite)

$ErrorActionPreference = "Stop"
$webConfigPath = "C:\inetpub\wwwroot\web.config"

# Adapter le chemin cible si votre application est sous un autre nom (ex: /IntuneWksManager)
$redirectTarget = "/intunewksmanager/Admin"

if (-not (Test-Path "C:\inetpub\wwwroot")) {
    Write-Host "Le repertoire du site par defaut n'existe pas. Adaptez le chemin dans ce script."
    exit 1
}

$rule = @"
    <rule name="Redirect typo intunewksmanagerdmin to IntuneWksManager Admin" stopProcessing="true">
      <match url="^intunewksmanagerdmin/?(.*)`$" ignoreCase="true" />
      <action type="Redirect" url="$redirectTarget{R:1}" redirectType="Permanent" />
    </rule>
"@

if (Test-Path $webConfigPath) {
    [xml]$config = Get-Content $webConfigPath -Encoding UTF8
    $sw = $config.configuration["system.webServer"]
    if (-not $sw) {
        $sw = $config.DocumentElement.AppendChild($config.CreateElement("system.webServer"))
    } else {
        $sw = $config.configuration["system.webServer"]
    }
    if (-not $sw.rewrite) {
        $rewrite = $config.CreateElement("rewrite")
        $sw.AppendChild($rewrite) | Out-Null
    }
    if (-not $sw.rewrite.rules) {
        $rules = $config.CreateElement("rules")
        $sw.rewrite.AppendChild($rules) | Out-Null
    }
    $existing = $sw.rewrite.rules.rule | Where-Object { $_.name -like "*intunewksmanagerdmin*" }
    if ($existing) {
        Write-Host "La regle de redirection existe deja dans $webConfigPath"
        exit 0
    }
    $rulesFragment = $config.CreateDocumentFragment()
    $rulesFragment.InnerXml = $rule
    $sw.rewrite.rules.AppendChild($rulesFragment) | Out-Null
    $config.Save($webConfigPath)
    Write-Host "Regle de redirection ajoutee dans $webConfigPath"
} else {
    $content = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        $rule
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@
    Set-Content -Path $webConfigPath -Value $content -Encoding UTF8
    Write-Host "Fichier $webConfigPath cree avec la regle de redirection."
}

Write-Host "Redemarrage IIS..."
iisreset
Write-Host "Termine. Testez: http://localhost/intunewksmanagerdmin/ doit rediriger vers $redirectTarget"
