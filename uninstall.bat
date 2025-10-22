@echo off
REM LMM - Lightweight Movie Maker Uninstaller for Windows
REM This script removes all LMM Video Editor components

setlocal enabledelayedexpansion

echo ================================
echo LMM Video Editor Uninstaller
echo Windows Edition
echo ================================
echo.

REM Check if running from LMM directory
if not exist package.json (
    echo ERROR: package.json not found!
    echo Please run this script from the LMM directory.
    pause
    exit /b 1
)

echo This will remove LMM Video Editor from your system.
echo.
set /p CONFIRM="Are you sure you want to uninstall? (y/n): "
if /i not "!CONFIRM!"=="y" (
    echo Uninstallation cancelled.
    pause
    exit /b 0
)

echo.
echo Step 1: Removing Node.js dependencies...
echo.

if exist node_modules (
    echo Removing node_modules folder...
    rmdir /s /q node_modules
    if exist node_modules (
        echo WARNING: Could not fully remove node_modules
        echo You may need to delete it manually.
    ) else (
        echo [OK] node_modules removed
    )
) else (
    echo [SKIP] node_modules not found
)

if exist package-lock.json (
    echo Removing package-lock.json...
    del /q package-lock.json
    echo [OK] package-lock.json removed
)

echo.
echo Step 2: Removing desktop shortcut...
echo.

set SHORTCUT_PATH=%USERPROFILE%\Desktop\LMM Video Editor.lnk
if exist "!SHORTCUT_PATH!" (
    del /q "!SHORTCUT_PATH!"
    echo [OK] Desktop shortcut removed
) else (
    echo [SKIP] Desktop shortcut not found
)

echo.
echo Step 3: Removing launcher files...
echo.

if exist lmm.bat (
    del /q lmm.bat
    echo [OK] lmm.bat removed
)

REM Note: We don't remove run_server.bat as it's part of the repository

echo.
echo Step 4: Cleaning up temporary files...
echo.

if exist uploads (
    set /p CLEAN_UPLOADS="Remove uploads folder? (y/n): "
    if /i "!CLEAN_UPLOADS!"=="y" (
        rmdir /s /q uploads 2>nul
        echo [OK] uploads folder removed
    )
)

if exist exports (
    set /p CLEAN_EXPORTS="Remove exports folder? (y/n): "
    if /i "!CLEAN_EXPORTS!"=="y" (
        rmdir /s /q exports 2>nul
        echo [OK] exports folder removed
    )
)

echo.
echo ================================
echo System Dependencies (Optional)
echo ================================
echo.
echo LMM has been uninstalled, but the following system dependencies
echo are still installed and may be used by other applications:
echo.
echo - Node.js
echo - npm
echo - FFmpeg
echo.

set /p REMOVE_DEPS="Do you want to remove Node.js and FFmpeg? (y/n): "
if /i "!REMOVE_DEPS!"=="y" (
    echo.
    echo Detecting package manager...

    set HAS_WINGET=0
    set HAS_CHOCO=0

    where winget >nul 2>&1
    if %errorLevel% equ 0 set HAS_WINGET=1

    where choco >nul 2>&1
    if %errorLevel% equ 0 set HAS_CHOCO=1

    if !HAS_WINGET! equ 1 (
        echo Removing Node.js...
        winget uninstall OpenJS.NodeJS.LTS
        echo Removing FFmpeg...
        winget uninstall Gyan.FFmpeg
    ) else if !HAS_CHOCO! equ 1 (
        echo Removing Node.js...
        choco uninstall nodejs-lts -y
        echo Removing FFmpeg...
        choco uninstall ffmpeg -y
    ) else (
        echo.
        echo No package manager found.
        echo Please uninstall Node.js and FFmpeg manually:
        echo.
        echo 1. Open Settings ^> Apps ^> Installed apps
        echo 2. Find and uninstall "Node.js"
        echo 3. Find and uninstall "FFmpeg"
        echo.
        echo Or use Control Panel ^> Programs and Features
    )
) else (
    echo System dependencies will remain installed.
)

echo.
echo ================================
echo Uninstallation Complete!
echo ================================
echo.
echo LMM Video Editor has been removed from your system.
echo.
echo You can delete this entire directory if you no longer need the source code.
echo.
echo To reinstall LMM Video Editor, run: install.bat
echo.

pause
endlocal
