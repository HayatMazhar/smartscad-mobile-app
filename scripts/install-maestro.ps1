#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $PSScriptRoot
$Dest = Join-Path $AppRoot '.tools\maestro'
$BinDir = Join-Path $Dest 'bin'
$MaestroBat = Join-Path $BinDir 'maestro.bat'
$MaestroSh = Join-Path $BinDir 'maestro'

if (Test-Path $MaestroBat) {
  Write-Host "Maestro already installed at $MaestroBat"
  exit 0
}

Write-Host 'Downloading Maestro CLI (requires Java 17+ on PATH)...'
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$zip = Join-Path ([System.IO.Path]::GetTempPath()) 'maestro-cli.zip'
Invoke-WebRequest -Uri 'https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip' -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $Dest -Force
Remove-Item $zip -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $MaestroBat) -and -not (Test-Path $MaestroSh)) {
  Write-Error "Extracted archive but could not find maestro under $Dest. Check release layout."
}

Write-Host "Maestro installed to: $BinDir"
Write-Host 'Add to PATH for this user (optional):'
Write-Host "  [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$BinDir', 'User')"
Write-Host 'Or run E2E via npm script (uses local binary when present).'
