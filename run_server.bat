@echo off
REM LMM - Lightweight Movie Maker Server Launcher for Windows

title LMM Video Editor Server

echo ================================
echo LMM Video Editor
echo ================================
echo.
echo Starting server...
echo The application will open in your default browser.
echo.
echo Press Ctrl+C to stop the server
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please run install.bat first or install Node.js manually
    echo.
    pause
    exit /b 1
)

REM Check if FFmpeg is installed
where ffmpeg >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: FFmpeg is not found in PATH
    echo Video processing may not work correctly
    echo Please run install.bat or install FFmpeg manually
    echo.
)

REM Check if node_modules exists
if not exist node_modules (
    echo WARNING: Dependencies not installed
    echo Running npm install...
    call npm install
    if %errorLevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the server
start "" http://localhost:3000

REM Run the server
call npm start

REM If server exits, pause to show any error messages
if %errorLevel% neq 0 (
    echo.
    echo Server exited with error
    pause
)
