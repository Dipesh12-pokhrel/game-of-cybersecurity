#!/usr/bin/env bash
# ===================================================================
#  Cyber Defence: Himalayan Data Vault - one-click launcher
#  (macOS / Linux companion to START-GAME.bat)
#
#  Make it executable once:   chmod +x start-game.sh
#  Then run it:               ./start-game.sh
#
#  If `npm install` cannot finish - offline, a proxy, a blocked package -
#  it falls back to the built-in server (serve.mjs) and the game still runs.
# ===================================================================
set -u
cd "$(dirname "$0")"

AFRAME_URL="https://aframe.io/releases/1.7.0/aframe.min.js"

echo
echo " ============================================================"
echo "   CYBER DEFENCE: HIMALAYAN DATA VAULT"
echo "   Cyber awareness training simulation"
echo " ============================================================"
echo

banner() {
  echo
  echo " ------------------------------------------------------------"
  echo "  The game opens automatically at  http://localhost:5173"
  echo "  If it does not, open that address in your browser."
  echo
  echo "  KEEP THIS WINDOW OPEN while you play."
  echo "  Press Ctrl+C to stop the server."
  echo " ------------------------------------------------------------"
  echo
}

# --- 1. Is Node.js installed? ---------------------------------------
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo " Node.js was not found on this computer."
  echo
  echo " The game needs Node.js 18 or newer."
  echo "   1. Install it from https://nodejs.org (or via your package manager)"
  echo "   2. Run this script again"
  echo
  exit 1
fi
echo " [1/4] Node.js found - $(node -v)"

# --- 2. Offline copy of A-Frame (downloaded directly, not via npm) ---
echo " [2/4] Checking the offline copy of A-Frame..."
if [ ! -f "public/vendor/aframe.min.js" ]; then
  mkdir -p public/vendor
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o public/vendor/aframe.min.js "$AFRAME_URL" || true
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O public/vendor/aframe.min.js "$AFRAME_URL" || true
  fi
  # A truncated or error-page download is worse than none at all.
  if [ -f "public/vendor/aframe.min.js" ]; then
    SIZE=$(wc -c < public/vendor/aframe.min.js | tr -d ' ')
    [ "$SIZE" -lt 200000 ] && rm -f public/vendor/aframe.min.js
  fi
fi
if [ -f "public/vendor/aframe.min.js" ]; then
  echo "       Offline copy ready - the game runs with or without internet."
else
  echo "       Could not download it. The game will load A-Frame from the"
  echo "       internet instead, which is fine as long as you are online."
fi

# --- 3. Dependencies (Vite only - small, from the normal registry) ---
echo " [3/4] Checking dependencies..."
USE_VITE=1
if [ -f "node_modules/vite/package.json" ]; then
  echo "       Dependencies ready."
else
  echo "       Installing Vite. This happens once and takes about a minute."
  echo
  if ! npm install --no-audit --no-fund; then
    echo
    echo "       That install did not finish. Clearing the npm cache and"
    echo "       trying once more..."
    echo
    npm cache clean --force >/dev/null 2>&1 || true
    if ! npm install --no-audit --no-fund; then
      echo
      echo " ------------------------------------------------------------"
      echo "  npm could not install Vite on this network."
      echo "  Not a problem - the game does not need a build step."
      echo "  Falling back to the built-in server instead."
      echo " ------------------------------------------------------------"
      USE_VITE=0
    fi
  fi
fi

# --- 4. Start the game ----------------------------------------------
if [ "$USE_VITE" = "1" ]; then
  echo " [4/4] Starting the local server..."
  banner
  npm run dev
else
  echo " [4/4] Starting the built-in server..."
  banner
  node serve.mjs
fi
