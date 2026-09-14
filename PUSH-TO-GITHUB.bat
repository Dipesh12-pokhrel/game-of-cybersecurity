@echo off
setlocal enabledelayedexpansion
title Publish to GitHub

REM ===================================================================
REM  Cyber Defence: Himalayan Data Vault
REM  Publishes this folder to a GitHub repository, ready for Vercel.
REM
REM  Run this once. Afterwards, to publish changes you only need:
REM      git add .  &&  git commit -m "your message"  &&  git push
REM  (or just double-click this file again - it handles repeats.)
REM ===================================================================

cd /d "%~dp0"

echo.
echo  ============================================================
echo    PUBLISH TO GITHUB
echo    Cyber Defence: Himalayan Data Vault
echo  ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 goto NO_GIT

REM --- Git needs to know who you are before it can commit ------------
git config user.email >nul 2>nul
if not errorlevel 1 goto HAVE_IDENTITY
git config --global user.email >nul 2>nul
if not errorlevel 1 goto HAVE_IDENTITY

echo  Git does not know who you are yet. This is stored on your
echo  computer only and is attached to your commits.
echo.
set "GIT_NAME="
set "GIT_MAIL="
set /p GIT_NAME=Your name: 
set /p GIT_MAIL=Your email: 
if "!GIT_NAME!"=="" goto MISSING
if "!GIT_MAIL!"=="" goto MISSING
git config --global user.name "!GIT_NAME!"
git config --global user.email "!GIT_MAIL!"
echo  Saved.
echo.

:HAVE_IDENTITY
REM --- Already linked to a repository? -------------------------------
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 goto FIRST_TIME
git remote get-url origin >nul 2>nul
if errorlevel 1 goto ASK_URL
for /f "tokens=*" %%u in ('git remote get-url origin') do set EXISTING=%%u
echo  This folder is already linked to:
echo    !EXISTING!
echo.
echo  Publishing your latest changes...
goto COMMIT_AND_PUSH

:FIRST_TIME
echo  STEP 1 - create an EMPTY repository on GitHub
echo.
echo    1. Open  https://github.com/new
echo    2. Give it a name, for example  cyber-defence-himalayan-data-vault
echo    3. Leave "Add a README file" UNTICKED - the repo must be empty
echo    4. Press "Create repository"
echo    5. Copy the address it shows, ending in .git
echo.
git init >nul
git branch -M main >nul 2>nul

:ASK_URL
set "REPO="
set /p REPO=Paste the repository URL here and press Enter: 
if "!REPO!"=="" goto MISSING
git remote remove origin >nul 2>nul
git remote add origin "!REPO!"
echo.

:COMMIT_AND_PUSH
echo  Staging files...
git add -A
git diff --cached --quiet
if not errorlevel 1 goto NOTHING_NEW

git commit -m "Cyber Defence: Himalayan Data Vault" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JjubZSZhb6kz3aQUKTp3wk"
if errorlevel 1 goto COMMIT_FAILED
goto PUSH

:NOTHING_NEW
echo  No new changes to commit - pushing what is already committed.

:PUSH
echo.
echo  Pushing to GitHub. A sign-in window may open - that is GitHub
echo  asking for your permission, not this script.
echo.
git push -u origin main
if errorlevel 1 goto PUSH_FAILED

echo.
echo  ------------------------------------------------------------
echo   Done. Your code is on GitHub.
echo.
echo   NEXT: go to  https://vercel.com/new
echo         sign in, pick this repository, press Deploy.
echo         Change no settings - vercel.json already has them.
echo  ------------------------------------------------------------
echo.
pause
goto :EOF


:NO_GIT
echo  ------------------------------------------------------------
echo   Git was not found on this computer.
echo.
echo    1. Install it from  https://git-scm.com/download/win
echo    2. Accept the default options
echo    3. Close this window and run this file again
echo  ------------------------------------------------------------
echo.
pause
goto :EOF

:MISSING
echo.
echo  Nothing was entered - stopping without changing anything.
echo.
pause
goto :EOF

:COMMIT_FAILED
echo.
echo  The commit did not go through. The message above says why.
echo.
pause
goto :EOF

:PUSH_FAILED
echo.
echo  ------------------------------------------------------------
echo   The push did not go through. The usual causes:
echo.
echo    * the repository on GitHub is not empty
echo      - create a fresh empty one, then run this again
echo    * the URL was mistyped
echo      - run:  git remote set-url origin YOUR-URL
echo    * sign-in was cancelled
echo      - run this file again and complete the GitHub sign-in
echo  ------------------------------------------------------------
echo.
pause
goto :EOF
