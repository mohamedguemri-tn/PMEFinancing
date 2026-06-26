#!/usr/bin/env bash
# Starts the backend connected to Supabase + Sepolia, then opens ngrok tunnel
# Usage: ./scripts/start-sepolia.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="$ROOT/.env.sepolia"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

[ -z "${DATABASE_URL:-}" ] && echo "ERROR: DATABASE_URL not set" && exit 1
[ -z "${BLOCKFIN_GOVERNOR_PRIVATE_KEY:-}" ] && echo "ERROR: BLOCKFIN_GOVERNOR_PRIVATE_KEY not set" && exit 1

export ASPNETCORE_ENVIRONMENT=Development
export ContractConfig__AssetTokenAddress=0x2527f64a08BC3dC1d373fDf63e1a80a72B8a105D
export ContractConfig__LoanManagerAddress=0xC795066E3ad49788640e1539B365036E40C4a3e6
export ContractConfig__RpcUrl=https://eth-sepolia.g.alchemy.com/v2/Ks11QIw9SumUIYRW9Aigm
export ContractConfig__GovernorAddress=0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D
export ContractConfig__RoleManagerAddress=0xB0d34552D18F9e3eDfAd13cFC7Bbca85c6f9db6e

cleanup() {
  echo "Shutting down..."
  [ -n "${NGROK_PID:-}" ] && kill "$NGROK_PID" 2>/dev/null || true
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend (Supabase + Sepolia)..."
cd "$ROOT/backend/src/Api"
dotnet run &
BACKEND_PID=$!

echo "Waiting for backend to start..."
for i in $(seq 1 60); do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "ERROR: backend process died before becoming healthy"
    exit 1
  fi
  if curl -sf http://localhost:5002/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ! curl -sf http://localhost:5002/api/health >/dev/null 2>&1; then
  echo "ERROR: backend did not become healthy within timeout"
  exit 1
fi
echo "Backend healthy"

echo "Starting ngrok tunnel..."
ngrok http --domain=flakily-vendor-trousers.ngrok-free.dev 5002 &
NGROK_PID=$!

echo "Waiting for ngrok tunnel..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -q "flakily-vendor-trousers"; then
    break
  fi
  sleep 1
done

echo "Granting on-chain roles to demo wallets..."
curl -sf -X POST "https://flakily-vendor-trousers.ngrok-free.dev/api/debug/grant-roles/all-demo-wallets" || \
  echo "WARNING: grant-roles call failed — run it manually if needed"

echo ""
echo "════════════════════════════════════════"
echo "  BlockFin PME — Sepolia Deployment"
echo "════════════════════════════════════════"
echo "  Frontend:  https://pme-financing.vercel.app"
echo "  Backend:   https://flakily-vendor-trousers.ngrok-free.dev/api"
echo "  Database:  Supabase PostgreSQL"
echo "  Blockchain: Sepolia testnet"
echo "════════════════════════════════════════"

wait $BACKEND_PID
