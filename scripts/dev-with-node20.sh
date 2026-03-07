#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE20_BIN="/opt/homebrew/opt/node@20/bin/node"
PORT="${PORT:-3008}"

if [ ! -x "$NODE20_BIN" ]; then
  echo "❌ Node 20 binary not found at $NODE20_BIN"
  echo "Install with: brew install node@20"
  exit 1
fi

NODE_MAJOR="$("$NODE20_BIN" -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" != "20" ]; then
  echo "❌ Expected Node 20, found Node $("$NODE20_BIN" -v)"
  exit 1
fi

echo "✅ Using $("${NODE20_BIN}" -v) for local dev"
"${NODE20_BIN}" "$PROJECT_ROOT/scripts/validate-env.js"
echo "🚀 Starting dev server on port ${PORT}"

unset CI NO_COLOR FORCE_COLOR CURSOR_AGENT 2>/dev/null || true
export TERM="${TERM:-xterm-256color}"
export NEXT_TELEMETRY_DISABLED=1

"${NODE20_BIN}" "$PROJECT_ROOT/node_modules/next/dist/bin/next" dev --port "${PORT}" --disable-source-maps
