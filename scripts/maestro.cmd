@echo off
setlocal
set "ROOT=%~dp0.."
set "MAESTRO=%ROOT%\.tools\maestro\bin\maestro.bat"
if exist "%MAESTRO%" (
  "%MAESTRO%" %*
) else (
  where maestro >nul 2>&1
  if errorlevel 1 (
    echo Maestro not found. Run: powershell -ExecutionPolicy Bypass -File "%ROOT%\scripts\install-maestro.ps1"
    exit /b 1
  )
  maestro %*
)
