#!/usr/bin/env bash
set -euo pipefail

cd /app

if [[ ! -d node_modules ]] || [[ ! -f node_modules/.bin/vite ]]; then
  echo "[web] npm install..."
  npm install
fi

echo "[web] vite on 0.0.0.0:5173 (proxy → ${VITE_PROXY_TARGET:-http://api:8000})"
exec npm run dev -- --host 0.0.0.0 --port 5173
