@echo off
title Cyber Defence: Himalayan Data Vault - no-install mode

REM ===================================================================
REM  Runs the game with NO npm install and NO build step at all.
REM  Use this if npm is broken, blocked or just slow on your network.
REM  The only requirement is Node.js.
REM ===================================================================

cd /d "%~dp0"

echo.
echo  ============================================================
echo    CYBER DEFENCE: HIMALAYAN DATA VAULT
echo    Starting in no-install mode
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo  Node.js was not found on this computer.
    echo  Install it from https://nodejs.org  then run this again.
    echo.
    pause
    goto :EOF
)

echo  The game opens automatically at  http://localhost:5173
echo  KEEP THIS WINDOW OPEN while you play. Ctrl+C stops the server.
echo.

node serve.mjs

echo.
echo  The server has stopped.
pause
