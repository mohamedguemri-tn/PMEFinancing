#!/usr/bin/env bash
# dev-stop.sh — Stop all BlockFin PME development services.
# Usage: ./scripts/dev-stop.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$ROOT/logs/dev.pids"

ok()  { printf '  \033[32m✔\033[0m %s\n' "$*"; }
info(){ printf '  \033[34m→\033[0m %s\n' "$*"; }

# Kill processes recorded by dev-start.sh
if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && ok "Stopped PID $pid" || true
    fi
  done <"$PID_FILE"
  rm -f "$PID_FILE"
else
  info "No PID file found at $PID_FILE"
fi

# Kill any remaining processes by port (belt-and-suspenders)
for PORT in 8545 5002; do
  PIDS=$(lsof -ti ":$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill 2>/dev/null || true
    ok "Freed port $PORT"
  fi
done

# Kill ng/npm dev server (Angular) — no fixed port lookup needed
pkill -f "ng serve" 2>/dev/null && ok "Stopped Angular dev server" || true
pkill -f "webpack" 2>/dev/null || true

# Stop (do NOT remove) SQL Server container so data persists
if docker ps --format '{{.Names}}' | grep -q '^sqlserver$'; then
  docker stop sqlserver >/dev/null
  ok "SQL Server container stopped (data preserved)"
fi

printf '\n  All services stopped.\n'
printf '  Restart with: ./scripts/dev-start.sh\n\n'
