@echo off
REM LMM - Lightweight Movie Maker Installer for Windows
REM This script installs all dependencies and sets up the application

setlocal enabledelayedexpansion

echo ================================
echo LMM Video Editor Installer
echo Windows Edition
echo ================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Not running as Administrator.
    echo Some package installations may require administrator privileges.
    echo.
    echo If you encounter permission errors, please:
    echo 1. Right-click on install.bat
    echo 2. Select "Run as administrator"
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" (
        exit /b 1
    )
    echo.
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
echo Step 1: Checking Node.js and npm...
echo.

REM Check if Node.js is already installed
set NODE_INSTALLED=0
set NPM_INSTALLED=0

where node >nul 2>&1
if %errorLevel% equ 0 (
    set NODE_INSTALLED=1
    echo [OK] Node.js already installed:
    node --version
    echo.
)

where npm >nul 2>&1
if %errorLevel% equ 0 (
    set NPM_INSTALLED=1
    echo [OK] npm already installed:
    npm --version
    echo.
)

if %NODE_INSTALLED% equ 0 (
    echo Installing Node.js and npm...
    if %HAS_WINGET% equ 1 (
        echo Using winget...
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    ) else if %HAS_CHOCO% equ 1 (
        echo Using Chocolatey...
        choco install nodejs-lts -y
    )

    REM Refresh PATH by reading registry
    echo Refreshing environment variables...
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSTEM_PATH=%%b"
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
    set "PATH=%SYSTEM_PATH%;%USER_PATH%"

    REM Check again
    where node >nul 2>&1
    if %errorLevel% neq 0 (
        echo.
        echo WARNING: Node.js may not be in PATH yet.
        echo Please close this window and open a new terminal, then run:
        echo   npm install
        echo.
        echo Or manually install Node.js from https://nodejs.org/
        set /p CONTINUE="Continue anyway? (y/n): "
        if /i not "!CONTINUE!"=="y" (
            pause
            exit /b 1
        )
    ) else (
        echo [OK] Node.js installed successfully!
        node --version
    )

    where npm >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] npm installed successfully!
        npm --version
    )
    echo.
) else (
    if %NPM_INSTALLED% equ 0 (
        echo WARNING: Node.js is installed but npm is not found in PATH.
        echo This is unusual. npm usually comes with Node.js.
        echo.
        echo Please try reinstalling Node.js from https://nodejs.org/
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Checking FFmpeg...
echo.

REM Check if FFmpeg is already installed
where ffmpeg >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] FFmpeg already installed:
    ffmpeg -version 2>&1 | findstr /C:"ffmpeg version"
    echo.
) else (
    echo Installing FFmpeg...
    if %HAS_WINGET% equ 1 (
        echo Using winget...
        winget install Gyan.FFmpeg --silent --accept-source-agreements --accept-package-agreements
    ) else if %HAS_CHOCO% equ 1 (
        echo Using Chocolatey...
        choco install ffmpeg -y
    )

    REM Refresh PATH by reading registry
    echo Refreshing environment variables...
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSTEM_PATH=%%b"
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
    set "PATH=%SYSTEM_PATH%;%USER_PATH%"

    where ffmpeg >nul 2>&1
    if %errorLevel% neq 0 (
        echo.
        echo WARNING: FFmpeg may not be in PATH yet.
        echo Please close this window and open a new terminal.
        echo.
        echo Or manually install FFmpeg:
        echo   1. Download from https://www.gyan.dev/ffmpeg/builds/
        echo   2. Extract to C:\ffmpeg
        echo   3. Add C:\ffmpeg\bin to your PATH
        echo.
        set /p CONTINUE="Continue anyway? (y/n): "
        if /i not "!CONTINUE!"=="y" (
            pause
            exit /b 1
        )
    ) else (
        echo [OK] FFmpeg installed successfully!
    )
    echo.
)

echo.
echo Step 3: Checking Node.js dependencies...
echo.

REM Check if package.json exists
if not exist package.json (
    echo ERROR: package.json not found!
    echo Please run this script from the LMM directory.
    pause
    exit /b 1
)

REM Check if node_modules exists and has packages
set NEED_INSTALL=1
if exist node_modules (
    echo Checking existing node_modules...
    REM Check if main dependencies exist
    if exist node_modules\express (
        if exist node_modules\multer (
            if exist node_modules\fluent-ffmpeg (
                echo [OK] Dependencies appear to be already installed.
                echo Skipping npm install...
                set NEED_INSTALL=0
                echo.
            )
        )
    )
)

if %NEED_INSTALL% equ 1 (
    echo Installing Node.js dependencies...
    echo This may take a few minutes...
    call npm install
    if %errorLevel% neq 0 (
        echo.
        echo ERROR: Failed to install Node.js dependencies
        echo.
        echo This might be due to:
        echo   - Network issues
        echo   - Permission problems
        echo   - Corrupted npm cache
        echo.
        echo Try running: npm cache clean --force
        echo Then run this installer again.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully!
    echo.
) else (
    echo To reinstall dependencies, delete the node_modules folder first.
    echo.
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
echo To uninstall LMM Video Editor, run: uninstall.bat
echo.

pause
endlocal
