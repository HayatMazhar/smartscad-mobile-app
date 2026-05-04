<#
  EAS Build helper that bypasses the 24 GB parent git repo.

  Problem: EAS Build walks up to find the git root (D:\SCAD\Codebase\devops\smarthelp)
  and packages 3.8 GB of unrelated code, exceeding the 2 GB upload limit.

  Solution: Stage only the Mobile App in a clean folder OUTSIDE the parent
  git repo, then run EAS Build from there. EAS sees no git repo, falls back
  to .easignore (which excludes node_modules etc.), and uploads ~7 MB.

  Usage:
    powershell ./scripts/eas-build.ps1 -Platform ios -Profile uat
    powershell ./scripts/eas-build.ps1 -Platform android -Profile uat
    powershell ./scripts/eas-build.ps1 -Platform ios -Profile production
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('ios','android','all')]
    [string]$Platform,

    [Parameter(Mandatory=$true)]
    [ValidateSet('development','uat','production')]
    [string]$Profile,

    [string]$StageRoot = 'D:\eas-stage'
)

$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $PSScriptRoot
$StagePath = Join-Path $StageRoot 'SmartSCAD.Mobile.App'

Write-Host "==> EAS Build helper" -ForegroundColor Cyan
Write-Host "    App source : $AppRoot"
Write-Host "    Stage path : $StagePath"
Write-Host "    Platform   : $Platform"
Write-Host "    Profile    : $Profile"
Write-Host ""

# Step 1 — clean stage
Write-Host "==> [1/4] Cleaning stage directory..." -ForegroundColor Yellow
if (Test-Path $StagePath) {
    Remove-Item $StagePath -Recurse -Force
}
New-Item -ItemType Directory -Path $StagePath -Force | Out-Null

# Step 2 — copy only what EAS needs (skip heavy folders + cross-platform native folders)
#
# Why we drop the OPPOSITE platform's native folder:
#   This project has android/ (bare workflow for Android) but no ios/ folder
#   (managed iOS via prebuild). When BOTH partial native folders go up to EAS,
#   it treats the project as bare and silently ignores app.json's ios.* and
#   android.* config (bundle id, ATS, infoPlist) — and CocoaPods install fails
#   because the iOS native project was never generated.
#   By excluding the unrelated platform's folder, EAS auto-prebuilds the missing
#   one from app.json and pods install correctly.
Write-Host "==> [2/4] Copying App files to stage (excluding heavy folders)..." -ForegroundColor Yellow
$excludeDirs = @(
    'node_modules',
    '.tools',
    '.expo',
    '.expo-shared',
    'dist',
    'web-build',
    '.idea',
    '.vscode'
)
if ($Platform -eq 'ios') {
    Write-Host "    iOS build: excluding android/ from stage so EAS auto-prebuilds iOS." -ForegroundColor Cyan
    $excludeDirs += 'android'
}
elseif ($Platform -eq 'android') {
    Write-Host "    Android build: excluding ios/ from stage." -ForegroundColor Cyan
    $excludeDirs += 'ios'
    # Drop android build artifacts but keep the native android folder
    $excludeDirs += 'android\app\build'
    $excludeDirs += 'android\app\.cxx'
    $excludeDirs += 'android\.gradle'
    $excludeDirs += 'android\.kotlin'
    $excludeDirs += 'android\build'
}
$excludeFiles = @('*.log', '.DS_Store', '*.orig.*')

# Use robocopy — it's fast and handles exclusions cleanly
$xdArgs = @()
foreach ($d in $excludeDirs) { $xdArgs += '/XD'; $xdArgs += (Join-Path $AppRoot $d) }
$xfArgs = @()
foreach ($f in $excludeFiles) { $xfArgs += '/XF'; $xfArgs += $f }

$robocopyArgs = @($AppRoot, $StagePath, '/E', '/NFL', '/NDL', '/NJH', '/NJS') + $xdArgs + $xfArgs
& robocopy @robocopyArgs | Out-Null
# Robocopy exit codes 0-7 are success; 8+ are failures
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

$staged = (Get-ChildItem $StagePath -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host ("    Staged size: {0:N1} MB" -f ($staged / 1MB))

# Step 3 — install node_modules in stage so expo config plugins resolve
Write-Host "==> [3/4] Installing node_modules in stage (npm install)..." -ForegroundColor Yellow
Push-Location $StagePath
try {
    # Use cmd /c to run npm so PowerShell doesn't intercept stderr as errors
    # --ignore-scripts skips patch-package postinstall (patches already applied in source)
    cmd /c "npm install --prefer-offline --no-audit --no-fund --ignore-scripts 2>&1"
    # cmd exit code mirrors npm exit code; 0=success, anything else=real failure
    if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
    Write-Host "    npm install complete." -ForegroundColor Green
} finally {
    Pop-Location
}

# Step 4 — run EAS Build from the stage
Write-Host "==> [4/4] Launching EAS Build (non-interactive)..." -ForegroundColor Yellow
Push-Location $StagePath
try {
    $env:EAS_NO_VCS = '1'
    $easCmd = "eas build --platform $Platform --profile $Profile --non-interactive"
    Write-Host "    > $easCmd"
    Invoke-Expression $easCmd
    if ($LASTEXITCODE -ne 0) { throw "EAS build failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

# Step 5 — done
Write-Host "==> [5/5] Build submitted. Check the build URL above for progress." -ForegroundColor Green
Write-Host "    Stage folder kept at $StagePath (delete manually if you want)."
