# BlockFin PME

[![CI](https://github.com/mohamedguemri-tn/PMEFinancing/actions/workflows/ci.yml/badge.svg)](https://github.com/mohamedguemri-tn/PMEFinancing/actions/workflows/ci.yml)

A blockchain-based participatory financing platform for SMEs.
Built with Angular 17, ASP.NET Core 8, Solidity, and Ganache.

## Quick Start
```bash
cp .env.example .env
# Add your Ganache accounts[0] private key to .env
docker compose up
```
Open http://localhost:4200

## Documentation
- [Setup Guide](SETUP.md)

---

# BlockFin PME — SME Financing Platform

A blockchain-based financing platform for Small and Medium Enterprises (SMEs). Users authenticate with their Ethereum wallet (MetaMask) — no passwords. The backend issues JWT tokens after verifying a signed nonce; smart contracts handle on-chain role registration and asset tokenization.

## Architecture Overview

```
┌─────────────────────┐    JWT     ┌──────────────────────┐    ethers.js
│  Angular 17 SPA     │◄──────────►│  ASP.NET Core 8 API  │◄─────────────►  Ganache / EVM
│  (port 4200)        │            │  (port 5002)         │
└─────────────────────┘            └──────────┬───────────┘
                                              │ EF Core
                                              ▼
                                       SQL Server (SMEFinancing DB)
```

**Four roles:**

| Role | Description |
|------|-------------|
| **Governor** | Platform admin — approves users, manages access |
| **PME** | SME — tokenizes assets, requests loans |
| **Investor** | Funds loan requests |
| **Guarantor** | Backs loan guarantees |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, Angular Material, ethers.js v6 |
| Backend | ASP.NET Core 8, CQRS/MediatR, EF Core 8 |
| Database | SQL Server |
| Blockchain | Solidity 0.8.x, Truffle, Ganache |
| Auth | Wallet signature (sign-nonce) + JWT |

## Prerequisites

- **Node.js** 18+ and npm
- **.NET 8 SDK**
- **SQL Server** (local or Express)
- **MetaMask** browser extension
- **Ganache CLI**: `npm install -g ganache-cli`
- **Truffle CLI**: `npm install -g truffle`

## Quick Start

### 1. Start Ganache (local blockchain)

```bash
ganache-cli --mnemonic "candy maple cake sugar pudding cream honey rich smooth alcohol ivory utility" --defaultBalanceEther 1000
```

Ganache listens on `http://127.0.0.1:8545`. The deterministic mnemonic always produces the same accounts, so demo wallet addresses stay consistent across restarts.

### 2. Deploy smart contracts

```bash
cd contracts
npm install
truffle migrate --reset --network development
```

Copy the deployed contract addresses into `backend/src/Api/appsettings.json` (see Configuration below).

### 3. Start the backend API

```bash
cd backend/src/Api
dotnet run
```

- API: `http://localhost:5002/api`
- Swagger UI: `http://localhost:5002/swagger`

On first start the database is auto-migrated and demo accounts are seeded (see Demo Accounts).

### 4. Start the frontend

```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:4200`.

## Configuration

### `backend/src/Api/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=SMEFinancing;User Id=sa;Password=YourPassword123!;Encrypt=False;TrustServerCertificate=True;"
  },
  "ContractConfig": {
    "RpcUrl": "http://127.0.0.1:8545",
    "RoleManagerAddress": "<deployed address>",
    "AssetTokenAddress": "<deployed address>",
    "LoanManagerAddress": "<deployed address>"
  },
  "GovernorWallet": "0xa94668df1c777404153891afc9251a3bfe65bf58",
  "DemoWallets": {
    "Pme":      "0x627306090abab3a6e1400e9345bc60c78a8bef57",
    "Investor": "0xf17f52151ebef6c7334fad080c5704d77216b732",
    "Guarantor":"0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef"
  },
  "Jwt": {
    "Secret": "SMEFinancingPlatformSuperSecretKey2026!!",
    "Issuer": "SMEFinancing",
    "Audience": "SMEFinancing"
  }
}
```

### `frontend/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5002/api'
};
```

## Demo Accounts

The seeder creates four pre-approved accounts at startup using the Ganache candy-maple mnemonic. Import these private keys into MetaMask to log in instantly:

| Role | Wallet Address | Ganache Account |
|------|---------------|-----------------|
| Governor | `0xa94668...bf58` | Account #5 |
| PME | `0x627306...ef57` | Account #1 |
| Investor | `0xf17f52...b732` | Account #2 |
| Guarantor | `0xc5fdf4...4fef` | Account #3 |

All accounts start with **1000 ETH** (Ganache test ETH — not real).

> To get private keys: run `ganache-cli` with the mnemonic above and note the printed "Private Keys" list, or derive them from the mnemonic using MetaMask's import-by-seed-phrase feature.

## Authentication Flow

1. User clicks "Connect Wallet" — MetaMask prompts for account access
2. Frontend calls `GET /api/auth/nonce?wallet=<address>` → server returns a random nonce
3. Frontend asks MetaMask to sign the nonce message
4. Frontend calls `POST /api/auth/login` with wallet + signature → server verifies, returns JWT
5. JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>` on all API calls

## Project Structure

```
code-mohamed/
├── frontend/                    # Angular 17 SPA
│   └── src/app/
│       ├── auth/                # Login, wallet service, JWT interceptor
│       ├── core/                # App shell, nav, shared services
│       ├── governor/            # Governor dashboard & admin views
│       ├── pme/                 # PME asset management & financing
│       ├── investor/            # Investor marketplace & portfolio
│       └── guarantor/           # Guarantor dashboard & guarantees
│
├── backend/src/
│   ├── Api/                     # Controllers, middleware, DI setup
│   ├── Application/             # CQRS commands/queries (MediatR)
│   ├── Domain/                  # Entities, value objects
│   └── Infrastructure/          # EF Core, blockchain service, seeder
│
├── contracts/
│   ├── contracts/
│   │   ├── RoleManager.sol      # On-chain role registry
│   │   ├── AssetToken.sol       # ERC-721 asset tokenization
│   │   ├── LoanManager.sol      # Loan lifecycle
│   │   └── FinancingToken.sol   # ERC-20 financing token
│   ├── migrations/              # Truffle deployment scripts
│   └── truffle-config.js
│
├── ganache.txt                  # Ganache startup command
└── README.md
```

## Backend Architecture Notes

- **Clean Architecture**: Domain → Application → Infrastructure → Api (dependency direction inward)
- **CQRS with MediatR**: each feature is a Command or Query handler under `Application/<feature>/`
- **Blockchain best-effort**: DB writes are committed first; the on-chain call runs in a try-catch so a failed RPC call does not roll back the database transaction
- **JWT blocklist middleware**: revoked tokens are stored in-memory and checked on each request
- **Database migrations**: run automatically on startup via `DatabaseSeeder.SeedAsync()`

## API Endpoints (key)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/nonce` | Request sign challenge |
| POST | `/api/auth/login` | Verify signature, get JWT |
| GET | `/api/assets` | List tokenized assets |
| POST | `/api/assets` | Tokenize a new asset (PME) |
| GET | `/api/admin/pending-users` | Pending registrations (Governor) |
| POST | `/api/admin/approve/{wallet}` | Approve a user (Governor) |
| GET | `/api/debug/state` | Dev-only: full DB state dump |

Full interactive docs at `http://localhost:5002/swagger`.

## Database Setup

Migrations are applied automatically on startup. To apply manually:

```bash
cd backend/src/Api
dotnet ef database update --project ../Infrastructure
```

To reseed demo data, delete the existing rows for the demo wallets (or drop and recreate the DB) and restart the backend.

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `RoleManager` | Registers wallet→role mappings on-chain |
| `AssetToken` | ERC-721 — each tokenized SME asset is an NFT |
| `LoanManager` | Loan request, funding, and repayment lifecycle |
| `FinancingToken` | ERC-20 utility token |

## License

[Specify your license here]
