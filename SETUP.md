# BlockFin PME — Developer Setup Guide

**Stack:** Angular 17 · ASP.NET Core 8 · SQL Server · Ganache (local EVM)  
**Time to first run:** ~15 minutes

---

## Cloud Deployment (Vercel + Koyeb)

The production app is deployed at:
- **Frontend:** https://pme-financing.vercel.app
- **Backend:** https://blockfin-pme-api.koyeb.app *(replace with your Koyeb URL after first deploy)*

### Backend — Koyeb (free tier, PostgreSQL)

The backend supports **both SQL Server** (local Docker Compose) and **PostgreSQL** (cloud).
Provider is auto-detected from the `DATABASE_URL` format:
- `Host=…` or `postgres://…` → PostgreSQL (`EnsureCreated` schema init)
- `Server=…` → SQL Server (`MigrateAsync` with incremental migrations)

#### Steps

1. Sign up at [koyeb.com](https://koyeb.com) with your GitHub account.
2. **Create App** → GitHub → select `PMEFinancing` repo → branch `main`.
3. Set build source to **Dockerfile** → path `backend/Dockerfile`, context `backend`.
4. Set the exposed port to **8000**.
5. Add a **PostgreSQL** database from the Koyeb addon panel — it generates a `DATABASE_URL`.
6. Add these **secrets** in the Koyeb dashboard (never commit secrets to `koyeb.yaml`):

| Secret | Value |
|--------|-------|
| `DATABASE_URL` | PostgreSQL connection string from Koyeb addon (auto-filled) |
| `BLOCKFIN_GOVERNOR_PRIVATE_KEY` | `0x52c0f8b10c7aabd449a9e03ed2dac4f8cbadc023a8cd13a01eb9d8d46d00fdbc` |
| `Jwt__Secret` | `SMEFinancingPlatformSuperSecretKey2026!!` |
| `Jwt__Issuer` | `SMEFinancing` |
| `Jwt__Audience` | `SMEFinancing` |
| `GovernorWallet` | `0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D` |

The non-secret variables (Sepolia RPC, contract addresses, CORS origin) are already in `koyeb.yaml`.

#### Verify

```bash
curl https://<your-app>.koyeb.app/api/health
# → {"status":"healthy","timestamp":"..."}
```

#### After deploy — update Vercel

Go to Vercel dashboard → `pme-financing` → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `RAILWAY_BACKEND_URL` | `https://<your-app>.koyeb.app` |

Then trigger a redeploy.

### Backend — Railway (legacy, kept for reference)

1. Create a new project on [railway.app](https://railway.app) and connect the GitHub repo.
2. Railway auto-detects `railway.json` and builds from `backend/Dockerfile`.
3. Add these environment variables in the Railway dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | SQL Server connection string from your Railway SQL plugin |
| `BLOCKFIN_GOVERNOR_PRIVATE_KEY` | Private key for the Sepolia Governor wallet (no `0x` prefix) |
| `Jwt__Secret` | Your JWT secret (same as local `appsettings.json`) |
| `Jwt__Issuer` | `SMEFinancing` |
| `Jwt__Audience` | `SMEFinancing` |
| `AllowedOrigins__0` | Your Vercel frontend URL (e.g. `https://pme-financing.vercel.app`) |

Railway automatically injects a `PORT` variable — the Dockerfile reads it via `${PORT:-8000}`.

### Frontend — Vercel

1. Import the repo on [vercel.com](https://vercel.com).
2. Vercel auto-detects `vercel.json` — no manual build settings needed.
3. Add this environment variable in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `RAILWAY_BACKEND_URL` | Your Railway backend URL (e.g. `https://pme-financing.up.railway.app`) |

At build time, Vercel's `buildCommand` in `vercel.json` runs `sed` to replace `RAILWAY_BACKEND_URL_PLACEHOLDER` in `environment.production.ts` with the actual URL before the Angular build runs.

> **Note:** The smart contracts are already deployed on Sepolia testnet (see addresses in `SETUP.md` Section — Sepolia). No re-deployment is needed for the cloud setup.

---

## Docker Compose (recommended for demo/deployment)

Runs everything in containers with one command. No local Node.js, .NET, or Ganache required.

```bash
cp .env.example .env
# .env already contains the correct Governor private key for the candy-maple mnemonic

docker-compose up --build
```

Services start in this order: **SQL Server → Ganache (deploys contracts) → Backend → Frontend**

Open `http://localhost:4200` when all four services are healthy (~3–5 minutes on first build).

To stop:
```bash
docker-compose down
```

To wipe all data and start completely fresh:
```bash
docker-compose down -v
docker-compose up --build
```

> **MetaMask note:** Point MetaMask at `http://localhost:8545`, Chain ID `1337`.
> The Ganache container uses the same candy-maple mnemonic as local dev, so imported accounts are identical.

---

## Sepolia Testnet Deployment

The smart contracts are deployed on Sepolia testnet:

| Contract | Address |
|----------|---------|
| RoleManager | `0xB0d34552D18F9e3eDfAd13cFC7Bbca85c6f9db6e` |
| AssetToken | `0x2527f64a08BC3dC1d373fDf63e1a80a72B8a105D` |
| LoanManager | `0xC795066E3ad49788640e1539B365036E40C4a3e6` |

View on Etherscan:
- [RoleManager](https://sepolia.etherscan.io/address/0xB0d34552D18F9e3eDfAd13cFC7Bbca85c6f9db6e)
- [AssetToken](https://sepolia.etherscan.io/address/0x2527f64a08BC3dC1d373fDf63e1a80a72B8a105D)
- [LoanManager](https://sepolia.etherscan.io/address/0xC795066E3ad49788640e1539B365036E40C4a3e6)

To use the production deployment:
1. Switch MetaMask to **Sepolia** network (Chain ID: 11155111)
2. Get free SepoliaETH from https://cloud.google.com/application/web3/faucet/ethereum/sepolia
3. Use the app normally — all transactions go to Sepolia

### After first deployment — grant demo wallet roles

Run once after the backend starts with the Sepolia config:

```bash
curl -X POST https://your-backend-url/api/debug/grant-roles/all-demo-wallets
```

This grants PME role on AssetToken + LoanManager for the demo PME wallet,
and INVESTOR role on LoanManager for the demo Investor wallet.

For new users registered through the UI, roles are granted automatically on approval.

---

## GitHub Actions CI

Every push to any branch automatically:
- Builds the backend and runs all 39 unit tests
- Builds the frontend production bundle
- Compiles the Solidity contracts

View results at: https://github.com/mohamedguemri-tn/PMEFinancing/actions

No secrets needed — the CI does not run blockchain transactions.
The `GOVERNOR_PRIVATE_KEY` is only needed locally (see Section 5).

---

## Section 1 — Prerequisites

Install every tool before continuing. All commands are Linux/Debian; adjust for your OS.

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | `nvm install 18` or [nodejs.org](https://nodejs.org) |
| .NET SDK | 8.0 | `sudo apt install dotnet-sdk-8.0` or [dot.net](https://dot.net) |
| SQL Server | 2022 | Docker command below |
| Docker | any | [docs.docker.com/install](https://docs.docker.com/install) |
| MetaMask | latest | Chrome/Firefox extension store |
| Ganache | 7.x | `npm install -g ganache` (NOT `ganache-cli`) |
| Truffle CLI | 5.x | `npm install -g truffle` |

**SQL Server via Docker (preferred):**
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123!" \
  -p 1433:1433 --name sqlserver -d \
  mcr.microsoft.com/mssql/server:2022-latest
```
Verify: `docker ps | grep sqlserver` — status must be `Up`.

---

## Quick Start (recommended)

If you just want to run the project:

```bash
git clone <repo-url> code-mohamed
cd code-mohamed
npm install                  # installs root dependencies
./scripts/dev-start.sh
```

This script handles Ganache startup, contract deployment, config file updates, backend, and frontend automatically. See `logs/` for per-service output.

For manual setup or troubleshooting, follow Sections 2–8 below.

---

## Section 2 — Clone and Install Dependencies

```bash
git clone <repo-url> code-mohamed
cd code-mohamed

# Root (wallet helper scripts)
npm install

# Frontend
cd frontend && npm install && cd ..

# Contracts
cd contracts && npm install && cd ..

# Backend
cd backend && dotnet restore && cd ..
```

---

## Section 3 — Start Ganache

> ⚠️ **Ganache v6 vs v7:** The same mnemonic produces **different accounts** in Ganache v6
> and v7. This project uses **Ganache v7**. If you installed `ganache-cli` (v6) instead of
> `ganache` (v7), the Governor address will be wrong and blockchain calls will fail silently.
>
> Install v7: `npm install -g ganache` (not `ganache-cli`)
> Verify version: `ganache --version` → must show `v7.x.x`

```bash
ganache \
  --mnemonic "candy maple cake sugar pudding cream honey rich smooth alcohol ivory utility" \
  --defaultBalanceEther 1000 \
  --port 8545
```

Ganache prints a table of accounts and private keys. **Match addresses to roles using this table:**

| Role | Address (from `appsettings.json`) | Ganache index |
|------|----------------------------------|---------------|
| **Governor** | `0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D` | [0] |
| **PME** | `0xD44f328a3887ECa9ef921FA490792d95f99c8906` | [1] |
| **Investor** | `0xCe8AfFdBdbdc02151784037Dba132b6447Abe37A` | [2] |
| **Guarantor** | `0xc4b418aCF701CFd3bFdEfd688323442866222218` | [3] |

> **Note:** These addresses are generated by Ganache v7 with the candy-maple mnemonic.
> Ganache v6 (`ganache-cli` < 7.x) generates different addresses from the same mnemonic.
> If your Ganache output shows different addresses, update all wallet fields in `appsettings.json` to match.

Keep this terminal open — Ganache must stay running.

---

## Section 4 — Deploy Smart Contracts

```bash
cd contracts
truffle migrate --reset --network development
```

The output prints each contract's address after deployment, e.g.:
```
Deploying 'RoleManager'...   contract address: 0xABC...
Deploying 'AssetToken'...    contract address: 0xDEF...
Deploying 'LoanManager'...   contract address: 0x123...
```

**After every `truffle migrate --reset` you must update two config files:**

1. `backend/src/Api/appsettings.json` → `ContractConfig` section:
   ```json
   "RoleManagerAddress": "<paste RoleManager address>",
   "AssetTokenAddress":  "<paste AssetToken address>",
   "LoanManagerAddress": "<paste LoanManager address>"
   ```

2. `frontend/src/environments/environment.ts`:
   ```typescript
   contractAddress: '<paste AssetToken address>',
   loanManagerAddress: '<paste LoanManager address>',
   ```

> After migration, `5_setup_roles.js` automatically grants PME, Investor,
> and Governor roles on all contracts for the demo wallets.
> No manual `grantRole` calls needed.

> `FinancingToken` and `LoanPool` are also deployed but not integrated — ignore their addresses.

---

## Section 5 — Backend Configuration Reference

Full `ContractConfig` block in `backend/src/Api/appsettings.json`:

```json
"ContractConfig": {
  "RpcUrl": "http://127.0.0.1:8545",          // never changes
  "RoleManagerAddress": "<from migrate>",       // ← update after every migrate --reset
  "AssetTokenAddress":  "<from migrate>",       // ← update after every migrate --reset
  "LoanManagerAddress": "<from migrate>",       // ← update after every migrate --reset
  "GovernorAddress":    "<Ganache account[0] address>"
}
```

`GovernorAddress` must be Ganache account[0] — the deployer account that gets `DEFAULT_ADMIN_ROLE` and `GOVERNOR` role on the contracts during `truffle migrate`.

`GovernorPrivateKey` must **not** be set in `appsettings.json`. Instead:

1. Copy the example file:
   ```bash
   cp backend/src/Api/appsettings.Development.json.example \
      backend/src/Api/appsettings.Development.json
   ```
2. Open `appsettings.Development.json` and paste the private key for Ganache `accounts[0]` (printed when Ganache starts — see Section 3).
3. This file is gitignored — it will never be committed.

Alternatively, set the environment variable before running:
```bash
export BLOCKFIN_GOVERNOR_PRIVATE_KEY=0xYourPrivateKeyHere
cd backend/src/Api && dotnet run
```

The backend checks `appsettings.Development.json` first, then `BLOCKFIN_GOVERNOR_PRIVATE_KEY`. If neither is set it exits on startup with a clear error message.

---

## Section 6 — Run the Backend

```bash
cd backend/src/Api
dotnet run
```

**Expected output on first start:**
```
Starting database migration...
Database migration completed.
Governor seeded: 0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D
Demo PME seeded: 0xD44f328a3887ECa9ef921FA490792d95f99c8906
Now listening on: http://localhost:5002
```

**Verify:**
```bash
curl http://localhost:5002/api/health
# → {"status":"healthy","timestamp":"..."}
```

Swagger UI: `http://localhost:5002/swagger`

---

## Section 7 — Run the Frontend

```bash
cd frontend
npm start
```

**Expected output:**
```
✔ Browser application bundle generation complete.
** Angular Live Development Server is listening on localhost:4200
```

Open `http://localhost:4200` in the browser that has MetaMask installed.

---

## Section 8 — Import MetaMask Accounts

Open MetaMask → click account avatar → **Import Account** → select **Private Key**.

Import one account per role. Private keys are printed when Ganache starts (see Section 3).

| Role | Address | Private Key |
|------|---------|-------------|
| Governor | `0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D` | from Ganache output [0] |
| PME | `0xD44f328a3887ECa9ef921FA490792d95f99c8906` | from Ganache output [1] |
| Investor | `0xCe8AfFdBdbdc02151784037Dba132b6447Abe37A` | from Ganache output [2] |
| Guarantor | `0xc4b418aCF701CFd3bFdEfd688323442866222218` | from Ganache output [3] |

> MetaMask must be connected to **localhost:8545** (Ganache).  
> Add network: Settings → Networks → Add → RPC URL `http://127.0.0.1:8545`, Chain ID `1337`.

---

## Section 9 — Test the Full Flow

Work through this checklist in order. Each step depends on the previous.

- [ ] **1. Register a PME**
  - Open `http://localhost:4200/register`
  - Switch MetaMask to the PME account (`0xD44f328a3887ECa9ef921FA490792d95f99c8906`)
  - Fill in Company Name, Email, Sector — click Register
  - Sign the MetaMask popup (wallet ownership proof)

- [ ] **2. Governor approves the PME**
  - Switch MetaMask to Governor account (`0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D`)
  - Login → Governor dashboard → Pending Users → click **Approve**
  - **Check backend logs:** look for `AssetToken.grantRole(PME) succeeded` — this confirms the on-chain PME role was granted at runtime.
  - **Note:** For the demo PME wallet, the migration already granted the PME role on-chain via `5_setup_roles.js`. Governor approval is still required for database-side approval so the PME can log in.

- [ ] **3. PME logs in**
  - Switch MetaMask to PME account
  - Go to `http://localhost:4200/login` → Connect Wallet → Sign nonce

- [ ] **4. PME creates an asset**
  - Dashboard → Assets → Add Asset
  - Fill Name, Type, Estimated Value → Save
  - Asset appears with status `REGISTERED`

- [ ] **5. PME tokenizes the asset**
  - Click **Tokenize** on the asset
  - MetaMask pops up → confirm the transaction
  - Wait for on-chain confirmation (~2-3 seconds on Ganache)
  - Asset status changes to `ATO`

- [ ] **6. Verify in database**
  ```bash
  curl -s http://localhost:5002/api/debug/state | python3 -m json.tool | grep -A5 tokenId
  ```
  The tokenized asset must show `"tokenId": <non-null number>`.

- [ ] **7. PME requests a loan**
  - Assets page → click **Request Loan** on the tokenized asset
  - Enter amount (in ETH) and duration (days) → Submit

- [ ] **8. Investor funds the loan**
  - Switch MetaMask to Investor account (`0xCe8Aff...be37A`)
  - Login → Investor dashboard → Marketplace
  - Find the loan → click **Fund**

- [ ] **9. Test liquidation (optional)**
  - To simulate an overdue loan, run:
    ```bash
    docker exec -it sqlserver /opt/mssql-tools18/bin/sqlcmd \
      -S localhost -U sa -P 'YourPassword123!' -N -C \
      -Q "UPDATE SMEFinancing.dbo.Loans SET DueDate = DATEADD(day, -1, GETUTCDATE()) WHERE Status = 'FUNDED'"
    ```
  - Switch MetaMask to Investor account (`0xCe8AfFdBdbdc02151784037Dba132b6447Abe37A`)
  - Login → **My Investments** tab
  - Find the overdue loan (shows red **OVERDUE** badge)
  - Click **Liquidate** → MetaMask pops up → confirm
  - Verify asset status becomes `LIQUIDATED` in the DB:
    ```bash
    docker exec -it sqlserver /opt/mssql-tools18/bin/sqlcmd \
      -S localhost -U sa -P 'YourPassword123!' -N -C \
      -Q "SELECT Name, Status FROM SMEFinancing.dbo.Assets WHERE Status = 'LIQUIDATED'"
    ```
  > **Note:** Liquidation must be triggered by the **Investor** (not the Governor). The smart contract
  > `liquidateCollateral()` requires `onlyRole(INVESTOR)` and checks `msg.sender == loan.investor`.
  > The Governor Overdue Loans page is a monitoring view only.

---

## Section 10 — Common Problems and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `sender account not recognized` | Contract addresses stale after `truffle migrate --reset` | Re-run migrate, copy new addresses into `appsettings.json` and `environment.ts` |
| `isPme` returns `false` / mint reverts | PME was never granted on-chain PME role | Check backend logs for `AssetToken.grantRole(PME)`. If it failed, re-approve the user as Governor. |
| `CALL_EXCEPTION` on gas estimate | PME wallet not in AssetToken PME role | Same as above — re-approve triggers grantRole |
| `Invalid signature` on login | Nonce expired (10-minute TTL) | Click Connect Wallet again to request a fresh nonce |
| `Address already in use: 5002` | Old dotnet process still running | `pkill -f "dotnet run"` then retry |
| Angular compile error | Missing node_modules | `cd frontend && npm install` |
| Backend fails to start: DB error | SQL Server not running | `docker start sqlserver` |
| MetaMask shows wrong network | MetaMask not on Ganache network | Switch to localhost:8545 / Chain ID 1337 in MetaMask networks |
| `User not found` on asset creation | JWT wallet claim missing — user not in DB | Ensure the user is registered and approved before creating assets |
| Backend starts but `GrantAssetTokenRoleAsync` fails with `GovernorPrivateKey is not configured` | Key not set after pulling latest code | Copy `appsettings.Development.json.example` to `appsettings.Development.json` and fill in the Ganache accounts[0] private key |
| Frontend shows "Too many requests" on login | Rate limiter triggered (5 nonce requests/min) | Wait 60 seconds and try again, or restart the backend to reset in-memory counters |
