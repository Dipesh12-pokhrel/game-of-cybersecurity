@echo off
setlocal enabledelayedexpansion
title Push to GitHub - game-

REM ===================================================================
REM  Pushes this folder to https://github.com/Dipesh12-pokhrel/game-
REM  Just double-click. Nothing to type unless GitHub asks you to sign in.
REM ===================================================================

set "REPO=https://github.com/Dipesh12-pokhrel/game-.git"

cd /d "%~dp0"

echo.
echo  ============================================================
echo    PUSHING TO GITHUB
echo    Dipesh12-pokhrel/game-
echo  ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 goto NO_GIT

REM --- make sure this folder is a git repo ---------------------------
git rev-parse --is-inside-work-tree >nul 2>nul
if not errorlevel 1 goto HAVE_REPO
echo  Setting up git in this folder...
git init >nul
:HAVE_REPO

REM --- identity (needed before a commit can be made) -----------------
git config user.email >nul 2>nul
if not errorlevel 1 goto HAVE_IDENTITY
git config --global user.email >nul 2>nul
if not errorlevel 1 goto HAVE_IDENTITY
echo  Setting a commit identity for this folder...
git config user.name "Dipesh Pokhrel"
git config user.email "rrudratech@gmail.com"
:HAVE_IDENTITY

REM --- point origin at the right repository --------------------------
git remote remove origin >nul 2>nul
git remote add origin "%REPO%"
git branch -M main >nul 2>nul

echo  Remote: %REPO%
echo.
echo  Staging files (node_modules and dist are skipped)...
git add -A

git diff --cached --quiet
if errorlevel 1 goto DO_COMMIT
echo  No new changes - pushing whatever is already committed.
goto PUSH

:DO_COMMIT
git commit -m "Cyber Defence: Himalayan Data Vault" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01RxhwHDKfxVGMpkUDRwAzaw"
if errorlevel 1 goto COMMIT_FAILED

:PUSH
echo.
echo  Pushing. If a GitHub sign-in window opens, that is GitHub
echo  asking for permission - complete it and this continues.
echo.
git push -u origin main
if not errorlevel 1 goto DONE

echo.
echo  Push was rejected. The repo on GitHub probably already has
echo  commits. Trying to merge them in and push again...
echo.
git pull --rebase origin main
if errorlevel 1 goto REBASE_FAILED
git push -u origin main
if errorlevel 1 goto PUSH_FAILED

:DONE
echo.
echo  ------------------------------------------------------------
echo   Done. Your code is at:
echo   https://github.com/Dipesh12-pokhrel/game-
echo  ------------------------------------------------------------
echo.
pause
goto :EOF

:NO_GIT
echo  ------------------------------------------------------------
echo   Git is not installed on this computer.
echo     1. Install from  https://git-scm.com/download/win
echo     2. Accept the default options
echo     3. Close this window and double-click this file again
echo  ------------------------------------------------------------
echo.
pause
goto :EOF

:COMMIT_FAILED
echo.
echo  The commit did not go through. The message above says why.
echo.
pause
goto :EOF

:REBASE_FAILED
echo.
echo  Could not merge the GitHub history automatically - there is a
echo  conflict. Tell Claude and paste the message above.
echo.
pause
goto :EOF

:PUSH_FAILED
echo.
echo  The push still did not go through. Usual causes:
echo    * GitHub sign-in was cancelled - run this again
echo    * no permission on Dipesh12-pokhrel/game-
echo  Paste the message above to Claude.
echo.
pause
goto :EOF
