@echo off
REM LMM - Lightweight Movie Maker Installer for Windows
REM This script installs all dependencies and sets up the application

REM Change to the script directory
cd /d "%~dp0"

echo ================================
echo LMM Video Editor Installer
echo Windows Edition
echo ================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Not running as Administrator.
    echo Some installations may require administrator privileges.
    echo.
    pause
)

REM Detect package manager
set HAS_WINGET=0
set HAS_CHOCO=0

where winget >nul 2>&1
if %errorLevel% equ 0 (
    set HAS_WINGET=1
    echo Found: winget package manager
)

where choco >nul 2>&1
if %errorLevel% equ 0 (
    set HAS_CHOCO=1
    echo Found: Chocolatey package manager
)

if %HAS_WINGET% equ 0 (
    if %HAS_CHOCO% equ 0 (
        echo.
        echo ERROR: No package manager found!
        echo.
        echo Please install either:
        echo   1. Winget (comes with Windows 11 or Windows 10 App Installer^)
        echo   2. Chocolatey (https://chocolatey.org/install^)
        echo.
        echo Or manually install:
        echo   - Node.js: https://nodejs.org/
        echo   - FFmpeg: https://ffmpeg.org/download.html
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Step 1: Installing Node.js...
echo.

REM Check if Node.js is already installed
where node >nul 2>&1
if %errorLevel% equ 0 (
    echo Node.js already installed:
    node --version
) else (
    if %HAS_WINGET% equ 1 (
        echo Installing Node.js via winget...
        winget install OpenJS.NodeJS.LTS --silent
    ) else if %HAS_CHOCO% equ 1 (
        echo Installing Node.js via Chocolatey...
        choco install nodejs-lts -y
    )

    REM Refresh environment variables
    call refreshenv 2>nul

    where node >nul 2>&1
    if %errorLevel% neq 0 (
        echo.
        echo WARNING: Node.js installation may have failed.
        echo Please restart your terminal or computer and run this script again.
        echo Or manually install Node.js from https://nodejs.org/
        pause
    )
)

echo.
echo Step 2: Installing FFmpeg...
echo.

REM Check if FFmpeg is already installed
where ffmpeg >nul 2>&1
if %errorLevel% equ 0 (
    echo FFmpeg already installed:
    ffmpeg -version 2>&1 | findstr /C:"ffmpeg version"
) else (
    if %HAS_WINGET% equ 1 (
        echo Installing FFmpeg via winget...
        winget install Gyan.FFmpeg --silent
    ) else if %HAS_CHOCO% equ 1 (
        echo Installing FFmpeg via Chocolatey...
        choco install ffmpeg -y
    )

    REM Refresh environment variables
    call refreshenv 2>nul

    where ffmpeg >nul 2>&1
    if %errorLevel% neq 0 (
        echo.
        echo WARNING: FFmpeg installation may have failed.
        echo Please restart your terminal and run this script again.
        echo Or manually install FFmpeg:
        echo   1. Download from https://www.gyan.dev/ffmpeg/builds/
        echo   2. Extract to C:\ffmpeg
        echo   3. Add C:\ffmpeg\bin to your PATH
        pause
    )
)

echo.
echo Step 3: Installing Node.js dependencies...
echo.

REM Install npm packages
if exist package.json (
    call npm install
    if %errorLevel% neq 0 (
        echo.
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
) else (
    echo ERROR: package.json not found!
    echo Please run this script from the LMM directory.
    pause
    exit /b 1
)

echo.
echo Step 4: Creating launcher script...
echo.

REM Create launcher script (run_server.bat will be created separately)
if not exist run_server.bat (
    echo Run_server.bat not found, you may need to create it manually.
)

echo.
echo Step 5: Creating desktop shortcut...
echo.

REM Create VBS script to make a shortcut
set SCRIPT_DIR=%~dp0
set SHORTCUT_PATH=%USERPROFILE%\Desktop\LMM Video Editor.lnk

REM Create a temporary VBS script to create the shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%SHORTCUT_PATH%" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_DIR%run_server.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "LMM Video Editor - Lightweight Movie Maker" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

if exist "%SHORTCUT_PATH%" (
    echo Desktop shortcut created successfully!
) else (
    echo Warning: Could not create desktop shortcut
)

echo.
echo ================================
echo Installation Complete!
echo ================================
echo.
echo You can start LMM Video Editor by:
echo.
echo 1. Double-click "LMM Video Editor" on your desktop
echo.
echo 2. Run from this directory:
echo    run_server.bat
echo.
echo 3. Run with npm:
echo    npm start
echo.
echo The application will be available at: http://localhost:3000
echo.
echo NOTE: If Node.js or FFmpeg were just installed, you may need to
echo       restart your terminal or computer for PATH changes to take effect.
echo.

pause
