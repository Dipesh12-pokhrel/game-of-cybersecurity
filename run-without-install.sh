#!/usr/bin/env bash
# Runs the game with NO npm install and NO build step. Only Node.js is needed.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install it from https://nodejs.org and run this again."
  exit 1
fi
echo
echo " The game opens automatically at http://localhost:5173"
echo " Keep this window open while you play. Ctrl+C stops the server."
echo
node serve.mjs
