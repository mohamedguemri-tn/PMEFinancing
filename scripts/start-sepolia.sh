#!/usr/bin/env bash
# Starts the backend connected to Supabase + Sepolia, then opens ngrok tunnel
# Usage: ./scripts/start-sepolia.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load secrets from .env.sepolia if it exists
ENV_FILE="$ROOT/.env.sepolia"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Validate required secrets
[ -z "${DATABASE_URL:-}" ] && echo "ERROR: DATABASE_URL not set" && exit 1
[ -z "${BLOCKFIN_GOVERNOR_PRIVATE_KEY:-}" ] && echo "ERROR: BLOCKFIN_GOVERNOR_PRIVATE_KEY not set" && exit 1

export ASPNETCORE_ENVIRONMENT=Development
export ContractConfig__AssetTokenAddress=0x2527f64a08BC3dC1d373fDf63e1a80a72B8a105D
export ContractConfig__LoanManagerAddress=0xC795066E3ad49788640e1539B365036E40C4a3e6
export ContractConfig__RpcUrl=https://eth-sepolia.g.alchemy.com/v2/Ks11QIw9SumUIYRW9Aigm
export ContractConfig__GovernorAddress=0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D
export ContractConfig__RoleManagerAddress=0xB0d34552D18F9e3eDfAd13cFC7Bbca85c6f9db6e

echo "Starting backend (Supabase + Sepolia)..."
cd "$ROOT/backend/src/Api"
dotnet run &
BACKEND_PID=$!

echo "Waiting for backend to start..."
until curl -sf http://localhost:5002/api/health >/dev/null 2>&1; do
  sleep 2
done
echo "Backend healthy"

echo "Starting ngrok tunnel..."
ngrok http --domain=flakily-vendor-trousers.ngrok-free.dev \
  --request-timeout=120s \
  5002 &

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
