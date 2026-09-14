@echo off
setlocal enabledelayedexpansion
title Cyber Defence: Himalayan Data Vault

REM ===================================================================
REM  Cyber Defence: Himalayan Data Vault - one-click launcher
REM
REM  Double-click this file. It checks Node.js, saves an offline copy of
REM  A-Frame, installs Vite the first time, then starts the game and
REM  opens your browser.
REM
REM  It also repairs the two failures people actually hit:
REM    * a half-finished npm install (missing @rollup native binary)
REM    * npm not working at all - it falls back to the built-in server
REM  Nothing here can leave you with a folder that will not run.
REM ===================================================================

cd /d "%~dp0"
set REPAIRED=0

echo.
echo  ============================================================
echo    CYBER DEFENCE: HIMALAYAN DATA VAULT
echo    Cyber awareness training simulation
echo  ============================================================
echo.

REM --- 1. Is Node.js installed? ---------------------------------------
where node >nul 2>nul
if errorlevel 1 goto NO_NODE
where npm >nul 2>nul
if errorlevel 1 goto NO_NODE
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo  [1/4] Node.js found - !NODE_VERSION!

REM --- 2. Offline copy of A-Frame (downloaded directly, not via npm) ---
echo  [2/4] Checking the offline copy of A-Frame...
if exist "public\vendor\aframe.min.js" goto AFRAME_OK
if not exist "public\vendor" mkdir "public\vendor"
where curl >nul 2>nul
if errorlevel 1 goto AFRAME_PS
curl -fsSL -o "public\vendor\aframe.min.js" "https://aframe.io/releases/1.7.0/aframe.min.js"
goto AFRAME_CHECK

:AFRAME_PS
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'https://aframe.io/releases/1.7.0/aframe.min.js' -OutFile 'public\vendor\aframe.min.js' } catch { exit 1 }"

:AFRAME_CHECK
if not exist "public\vendor\aframe.min.js" goto AFRAME_SKIP
for %%A in ("public\vendor\aframe.min.js") do set AF_SIZE=%%~zA
if !AF_SIZE! LSS 200000 (
    del /q "public\vendor\aframe.min.js" >nul 2>nul
    goto AFRAME_SKIP
)

:AFRAME_OK
echo        Offline copy ready - the game runs with or without internet.
goto DEPS

:AFRAME_SKIP
echo        Could not download it. The game will load A-Frame from the
echo        internet instead, which is fine as long as you are online.

REM --- 3. Dependencies ------------------------------------------------
:DEPS
echo  [3/4] Checking dependencies...
if not exist "node_modules\vite\package.json" goto DO_INSTALL

REM  npm has a long-standing bug where an interrupted install leaves
REM  node_modules without the platform-specific Rollup binary that Vite
REM  needs. Detect that precisely rather than guessing.
dir /b "node_modules\@rollup\rollup-win32-*" >nul 2>nul
if errorlevel 1 goto REPAIR
dir /b "node_modules\@esbuild\win32-*" >nul 2>nul
if errorlevel 1 goto REPAIR
echo        Dependencies ready.
goto RUN_VITE

:REPAIR
if "!REPAIRED!"=="1" (
    echo        Repair did not help - using the built-in server instead.
    goto RUN_SIMPLE
)
set REPAIRED=1
echo        The existing install is incomplete - a known npm bug leaves
echo        out a platform file that Vite needs.
echo        Removing node_modules and package-lock.json and retrying...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /q "package-lock.json"
echo.

:DO_INSTALL
echo        Installing Vite. This takes about a minute.
echo.
call npm install --no-audit --no-fund
if not errorlevel 1 goto INSTALL_DONE
echo.
echo        That install did not finish. Clearing the npm cache and
echo        trying once more...
echo.
call npm cache clean --force >nul 2>nul
call npm install --no-audit --no-fund
if not errorlevel 1 goto INSTALL_DONE
echo.
echo  ------------------------------------------------------------
echo   npm could not install Vite on this network.
echo   Not a problem - the game does not need a build step.
echo   Falling back to the built-in server instead.
echo  ------------------------------------------------------------
goto RUN_SIMPLE

:INSTALL_DONE
echo.
echo        Dependencies installed.
dir /b "node_modules\@rollup\rollup-win32-*" >nul 2>nul
if errorlevel 1 goto REPAIR

REM --- 4. Start the game ----------------------------------------------
:RUN_VITE
echo  [4/4] Starting the local server...
call :BANNER
call npm run dev
if not errorlevel 1 goto DONE
echo.
echo  ------------------------------------------------------------
echo   The Vite dev server exited with an error.
echo   Starting the built-in server instead - the game is identical,
echo   it just will not hot-reload while you edit the code.
echo  ------------------------------------------------------------

:RUN_SIMPLE
echo  [4/4] Starting the built-in server...
call :BANNER
node serve.mjs
goto DONE

:BANNER
echo.
echo  ------------------------------------------------------------
echo   The game opens automatically at  http://localhost:5173
echo   If it does not, open that address in your browser.
echo.
echo   KEEP THIS WINDOW OPEN while you play.
echo   Press Ctrl+C to stop the server.
echo  ------------------------------------------------------------
echo.
goto :EOF

:DONE
echo.
echo  The server has stopped.
pause
goto :EOF


:NO_NODE
echo.
echo  ------------------------------------------------------------
echo   Node.js was not found on this computer.
echo.
echo   The game needs Node.js 18 or newer.
echo    1. Go to  https://nodejs.org
echo    2. Download the LTS version and install it
echo    3. Close this window and double-click START-GAME.bat again
echo  ------------------------------------------------------------
echo.
pause
goto :EOF
