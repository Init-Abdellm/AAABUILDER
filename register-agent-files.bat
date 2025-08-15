@echo off
echo Registering .agent files with z.png icon...
echo.
echo This script will register .agent files to use the z.png icon
echo and associate them with AAABuilder commands.
echo.
echo You need to run this as Administrator for it to work.
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - proceeding...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0register-agent-files.ps1"
) else (
    echo ERROR: This script must be run as Administrator!
    echo Right-click on this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo Registration complete! You may need to restart File Explorer.
pause
