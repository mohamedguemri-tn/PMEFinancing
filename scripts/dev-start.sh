#!/usr/bin/env bash
# dev-start.sh — Start all BlockFin PME services for local development.
# Usage: ./scripts/dev-start.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

APPSETTINGS="$ROOT/backend/src/Api/appsettings.json"
ENV_TS="$ROOT/frontend/src/environments/environment.ts"

GANACHE_LOG="$LOGS/ganache.log"
BACKEND_LOG="$LOGS/backend.log"
FRONTEND_LOG="$LOGS/frontend.log"
PID_FILE="$LOGS/dev.pids"

MNEMONIC="candy maple cake sugar pudding cream honey rich smooth alcohol ivory utility"
GANACHE_PORT=8545
BACKEND_PORT=5002

# ─── Helpers ──────────────────────────────────────────────────────────────────

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
info()  { printf '  \033[34m→\033[0m %s\n' "$*"; }
ok()    { printf '  \033[32m✔\033[0m %s\n' "$*"; }
err()   { printf '  \033[31m✖\033[0m %s\n' "$*" >&2; }
die()   { err "$*"; exit 1; }

# ─── Governor private key check ──────────────────────────────────────────────

APPSETTINGS_DEV="$ROOT/backend/src/Api/appsettings.Development.json"
if [ ! -f "$APPSETTINGS_DEV" ] && [ -z "${BLOCKFIN_GOVERNOR_PRIVATE_KEY:-}" ]; then
  printf '\n'
  err "GovernorPrivateKey is not configured."
  info "Blockchain approval calls will fail at runtime."
  printf '\n'
  info "Fix: copy the example file and fill in the key:"
  info "  cp backend/src/Api/appsettings.Development.json.example \\"
  info "     backend/src/Api/appsettings.Development.json"
  printf '\n'
  info "Then add your Ganache accounts[0] private key to that file."
  info "Press Ctrl+C to abort, or wait 5 seconds to continue anyway..."
  sleep 5
fi

# ─── Step 1 — Prerequisites check ────────────────────────────────────────────

bold "Checking prerequisites..."
MISSING=0
for cmd in ganache truffle dotnet docker node npm python3; do
  if command -v "$cmd" &>/dev/null; then
    ok "$cmd found ($(command -v "$cmd"))"
  else
    err "$cmd not found — install it and retry"
    MISSING=1
  fi
done
[ "$MISSING" -eq 0 ] || die "Missing prerequisites. See SETUP.md Section 1."

# ─── Step 2 — SQL Server ─────────────────────────────────────────────────────

bold "Starting SQL Server..."
if docker ps --format '{{.Names}}' | grep -q '^sqlserver$'; then
  ok "SQL Server already running"
elif docker ps -a --format '{{.Names}}' | grep -q '^sqlserver$'; then
  info "Starting existing sqlserver container..."
  docker start sqlserver >/dev/null
  ok "SQL Server started"
else
  info "Creating and starting SQL Server container..."
  docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123!" \
    -p 1433:1433 --name sqlserver -d \
    mcr.microsoft.com/mssql/server:2022-latest >/dev/null
  info "Waiting 15s for SQL Server to initialise..."
  sleep 15
  ok "SQL Server created and started"
fi

# ─── Step 3 — Ganache ────────────────────────────────────────────────────────

bold "Starting Ganache v7..."
# Kill any existing ganache on this port
if lsof -ti ":$GANACHE_PORT" &>/dev/null || true; then
  info "Port $GANACHE_PORT in use — killing existing process..."
  kill "$(lsof -ti ":$GANACHE_PORT")" 2>/dev/null || true
  sleep 1
fi

ganache \
  --mnemonic "$MNEMONIC" \
  --defaultBalanceEther 1000 \
  --port "$GANACHE_PORT" \
  >"$GANACHE_LOG" 2>&1 &
GANACHE_PID=$!
echo "$GANACHE_PID" >"$PID_FILE"

info "Waiting 3s for Ganache to start..."
sleep 3

# Verify Ganache is up
if ! curl -sf http://127.0.0.1:$GANACHE_PORT \
    -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null; then
  die "Ganache failed to start. Check $GANACHE_LOG"
fi
ok "Ganache running (PID $GANACHE_PID) → $GANACHE_LOG"

# ─── Step 4 — Deploy contracts ───────────────────────────────────────────────

bold "Deploying smart contracts (truffle migrate --reset)..."
MIGRATE_LOG="$LOGS/migrate.log"
cd "$ROOT/contracts"
truffle migrate --reset --network development >"$MIGRATE_LOG" 2>&1 \
  || die "truffle migrate failed. Check $MIGRATE_LOG"

if grep -q "Roles granted" "$MIGRATE_LOG" 2>/dev/null; then
  ok "On-chain demo roles granted (migration 5_setup_roles.js):"
  grep -E "(Governor|PME|Investor|Guarantor):" "$MIGRATE_LOG" | while IFS= read -r line; do
    info "$(echo "$line" | sed 's/^[[:space:]]*//')"
  done
else
  err "WARNING: role grant confirmation not found in migrate output — check $MIGRATE_LOG"
fi

# Parse all contract addresses in deployment order:
# [0]=FinancingToken [1]=LoanPool [2]=RoleManager [3]=AssetToken [4]=LoanManager
mapfile -t ADDRS < <(grep "contract address:" "$MIGRATE_LOG" | awk '{print $NF}')
ROLE_MGR_ADDR="${ADDRS[2]:-}"
ASSET_TOKEN_ADDR="${ADDRS[3]:-}"
LOAN_MGR_ADDR="${ADDRS[4]:-}"

[ -n "$ROLE_MGR_ADDR" ]  || die "Could not parse RoleManager address from migrate output. Check $MIGRATE_LOG"
[ -n "$ASSET_TOKEN_ADDR" ] || die "Could not parse AssetToken address from migrate output."
[ -n "$LOAN_MGR_ADDR" ]  || die "Could not parse LoanManager address from migrate output."

ok "RoleManager:  $ROLE_MGR_ADDR"
ok "AssetToken:   $ASSET_TOKEN_ADDR"
ok "LoanManager:  $LOAN_MGR_ADDR"

# ─── Step 5 — Update config files ────────────────────────────────────────────

bold "Updating config files with new contract addresses..."
cd "$ROOT"

python3 - <<PYEOF
import json, sys

path = "$APPSETTINGS"
with open(path) as f:
    data = json.load(f)

cc = data["ContractConfig"]
cc["RoleManagerAddress"] = "$ROLE_MGR_ADDR"
cc["AssetTokenAddress"]  = "$ASSET_TOKEN_ADDR"
cc["LoanManagerAddress"] = "$LOAN_MGR_ADDR"

with open(path, "w") as f:
    json.dump(data, f, indent=2)
print("  \033[32m✔\033[0m appsettings.json updated")
PYEOF

# Update environment.ts (sed is safe here — single well-known line)
sed -i "s|contractAddress: '0x[0-9a-fA-F]*'|contractAddress: '$ASSET_TOKEN_ADDR'|" "$ENV_TS"
sed -i "s|loanManagerAddress: '0x[0-9a-fA-F]*'|loanManagerAddress: '$LOAN_MGR_ADDR'|" "$ENV_TS"
ok "environment.ts updated (contractAddress = $ASSET_TOKEN_ADDR, loanManagerAddress = $LOAN_MGR_ADDR)"

# ─── Step 6 — Start backend ──────────────────────────────────────────────────

bold "Starting backend (ASP.NET Core)..."
if lsof -ti ":$BACKEND_PORT" &>/dev/null || true; then
  info "Port $BACKEND_PORT in use — killing existing process..."
  kill "$(lsof -ti ":$BACKEND_PORT")" 2>/dev/null || true
  sleep 2
fi

cd "$ROOT/backend/src/Api"
dotnet run >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >>"$PID_FILE"

info "Waiting for backend health endpoint (up to 30s)..."
WAITED=0
until curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  [ "$WAITED" -le 30 ] || die "Backend did not become healthy in 30s. Check $BACKEND_LOG"
done
ok "Backend healthy (PID $BACKEND_PID) → $BACKEND_LOG"

# ─── Step 7 — Start frontend ─────────────────────────────────────────────────

bold "Starting frontend (Angular)..."
cd "$ROOT/frontend"
npm start >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >>"$PID_FILE"
ok "Frontend starting (PID $FRONTEND_PID) → $FRONTEND_LOG"
info "Angular takes ~15s to compile — wait for 'Compiled successfully' in $FRONTEND_LOG"

# ─── Summary ─────────────────────────────────────────────────────────────────

printf '\n'
printf '════════════════════════════════════════\n'
printf '  BlockFin PME — All services running  \n'
printf '════════════════════════════════════════\n'
printf '  Frontend:  http://localhost:4200\n'
printf '  Backend:   http://localhost:%s/api\n' "$BACKEND_PORT"
printf '  Swagger:   http://localhost:%s/swagger\n' "$BACKEND_PORT"
printf '  Ganache:   http://127.0.0.1:%s\n' "$GANACHE_PORT"
printf '\n'
printf '  Governor:  0xa3BCcC...594D  (MetaMask accounts[0])\n'
printf '  PME:       0xD44f32...8906  (MetaMask accounts[1])\n'
printf '  Investor:  0xCe8Aff...e37A  (MetaMask accounts[2])\n'
printf '\n'
printf '  Logs:  logs/ganache.log | logs/backend.log | logs/frontend.log\n'
printf '  Stop:  ./scripts/dev-stop.sh\n'
printf '════════════════════════════════════════\n'
