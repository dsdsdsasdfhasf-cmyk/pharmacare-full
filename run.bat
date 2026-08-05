@echo off
setlocal enabledelayedexpansion

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: Run the Node.js runner script
node run.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo Application exited with an error.
    pause
)
