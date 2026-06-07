# BlockFin PME — Handover Document

## Project Overview

BlockFin PME is a blockchain-based participatory financing platform for SMEs.
PMEs tokenize their physical assets as ERC-721 NFTs and use them as collateral for ETH loans.
Investors fund loan requests. Guarantors provide additional asset-backed backing.
Every critical transaction is signed via MetaMask and recorded on the Ethereum Sepolia testnet.

**Built as an internship project by:** Mohamed Guemri
**Supervisor:** [supervisor name]
**Period:** [internship period]
**Repository:** https://github.com/mohamedguemri-tn/PMEFinancing

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17, Angular Material, ethers.js v6 |
| Backend | ASP.NET Core 8, Clean Architecture (CQRS + MediatR) |
| Database | SQL Server (local dev) / PostgreSQL Supabase (cloud) |
| Blockchain | Solidity 0.8.x, OpenZeppelin v4, Sepolia testnet |
| Real-time | SignalR (LongPolling in production via ngrok) |
| Authentication | MetaMask wallet + JWT (nonce/signature pattern) |
| Testing | xUnit, Moq, FluentAssertions — 52 tests, 0 failures |
| CI/CD | GitHub Actions (3 jobs: backend, frontend, contracts) |
| Code quality | SonarCloud (Quality Gate: Passed), Codecov (36% backend) |

---

## Live Deployment

| Service | URL |
|---------|-----|
| Frontend | https://pme-financing.vercel.app |
| Backend | https://flakily-vendor-trousers.ngrok-free.dev/api |
| Swagger UI | https://flakily-vendor-trousers.ngrok-free.dev/swagger |
| Database | Supabase PostgreSQL (eu-west-2) |
| Blockchain | Sepolia testnet |

> **The backend requires a running laptop.** It is exposed via ngrok (`./scripts/start-sepolia.sh`).
> The frontend is always live on Vercel regardless of backend state.

### Smart Contracts (Permanent — Sepolia)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| RoleManager | `0xB0d34552D18F9e3eDfAd13cFC7Bbca85c6f9db6e` | [View](https://sepolia.etherscan.io/address/0xB0d34552D18F9e3eDfAd13cFC7Bbca85c6f9db6e) |
| AssetToken | `0x2527f64a08BC3dC1d373fDf63e1a80a72B8a105D` | [View](https://sepolia.etherscan.io/address/0x2527f64a08BC3dC1d373fDf63e1a80a72B8a105D) |
| LoanManager | `0xC795066E3ad49788640e1539B365036E40C4a3e6` | [View](https://sepolia.etherscan.io/address/0xC795066E3ad49788640e1539B365036E40C4a3e6) |

These contracts are deployed once and permanent. Restarting the backend or clearing the database does **not** redeploy them.

---

## Architecture

### Backend — Clean Architecture

```
backend/src/
├── Api/              # Controllers, Middleware, Hubs, SignalR, Program.cs
├── Application/      # CQRS handlers, commands, queries, interfaces, DTOs
├── Domain/           # Entities, enums, BaseEntity (Id, CreatedAt, IsDeleted)
└── Infrastructure/   # EF Core, BlockchainService (Nethereum), TestDataSeeder
```

- **CQRS via MediatR** — every feature is a `Command` (write) or `Query` (read) handler.
- **Clean Architecture** — dependency direction: Api → Application → Domain ← Infrastructure.
- **No passwords** — only wallet address + JWT. JWTs are signed with `Jwt:Secret` from configuration (never hardcoded).
- **Soft delete** — `BaseEntity` has `IsDeleted`. Deleting a user sets `IsDeleted = true` on the user and cascades to their assets. Loans are kept intact for audit trail.
- **Rate limiting** — 5 nonce/min, 3 register/10min, 10 login/min per IP (in-memory; restarts clear counters).

### Frontend — Angular 17

```
frontend/src/app/
├── core/             # AppShell, auth service, interceptors, guards, SignalR
├── governor/         # Dashboard, registrations, user management, audit, params
├── pme/              # Asset management, tokenize dialog, financing, repay dialog
├── investor/         # Dashboard (Chart.js doughnut), marketplace, investments
└── guarantor/        # Dashboard, assets, marketplace, backed loans
```

- All HTTP requests go through `AuthInterceptor` (adds `Bearer` token + `ngrok-skip-browser-warning` header).
- SignalR uses **LongPolling** in production (more stable through ngrok) and all transports in development.
- Notification bell uses `ng2-charts` for the portfolio doughnut. Chart data requires a **new object reference** to trigger Angular change detection — `this.doughnutChartData = { … }`, not mutation.

### Smart Contracts

```
contracts/contracts/
├── RoleManager.sol   # AccessControl — PME/INVESTOR/GUARANTOR/GOVERNOR roles
├── AssetToken.sol    # ERC-721 — NFT tokenization of physical assets
└── LoanManager.sol   # Loan lifecycle: request → fund → repay/liquidate
```

- **MetaMask signs all user transactions** (tokenize, requestLoan, fundLoan, repayLoan, liquidate).
- **Governor signs server-side** via Nethereum — `grantRole` calls only.
- Backend never holds user private keys.

---

## User Roles & Flows

### Governor
- Approves or rejects pending user registrations.
- On approval, automatically grants all required on-chain roles via the Governor private key.
- Views platform statistics, recent activity, overdue loans.
- Manages all users: filter by role, search by wallet, soft-delete accounts.

### PME (Small/Medium Enterprise)
1. Register → wait for Governor approval
2. Create asset (name, type, estimated value)
3. **Tokenize asset** → MetaMask calls `AssetToken.mint()` → ERC-721 NFT minted on Sepolia
4. **Request loan** → MetaMask approves NFT transfer, calls `LoanManager.requestLoan()` → NFT locked as collateral
5. Receive ETH when Investor funds the loan
6. **Repay loan** → MetaMask calls `LoanManager.repayLoan()` → NFT returned, asset status reset to ATO

> Before `requestLoan`, the frontend checks `ownerOf(tokenId)` to confirm the PME still holds the NFT, then calls `getApproved(tokenId)` and skips `approve()` if LoanManager is already the approved operator (avoids "approval to current owner" revert on reused assets).

### Investor
1. Register → wait for Governor approval
2. Browse loan marketplace (all REQUESTED loans)
3. **Fund a loan** → MetaMask calls `LoanManager.fundLoan(loanId)` with exact ETH value
4. Receive real-time SignalR notification when new loans are requested
5. **Liquidate collateral** if loan is overdue (past due date)

### Guarantor
1. Register → wait for Governor approval
2. Add assets to portfolio, tokenize them
3. **Back a loan** → offers a tokenized asset as additional collateral
4. **Withdraw guarantee** — only while loan is still in REQUESTED status

---

## Demo Wallets (Candy-Maple Mnemonic — Sepolia)

| Role | Address | Private Key |
|------|---------|-------------|
| Governor | `0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D` | `0x52c0f8b10c7aabd449a9e03ed2dac4f8cbadc023a8cd13a01eb9d8d46d00fdbc` |
| PME | `0xD44f328a3887ECa9ef921FA490792d95f99c8906` | `0x61471255690699506d95b33b66b640d033321d3430260a644bc7444e59e3ab2c` |
| Investor | `0xCe8AfFdBdbdc02151784037Dba132b6447Abe37A` | `0xdd84c753f27841fbf4a2eebe5f40dacc303c04b80e3f59f70b66306011e4b8de` |
| Guarantor | `0xc4b418aCF701CFd3bFdEfd688323442866222218` | `0xbc67042bd7f231ad19380bc829ce84138a78d4da24a198393bc4493c262c37f0` |

> ⚠️ **Testnet-only wallets. Never use them with real ETH.**

MetaMask → Import Account → Paste private key. Switch network to **Sepolia** (Chain ID: 11155111).

---

## Starting the Project

### Cloud Demo (Sepolia + Vercel)

```bash
# Terminal 1 — Start backend + ngrok tunnel
./scripts/start-sepolia.sh

# Terminal 2 — Grant on-chain roles for demo wallets (run once after fresh DB)
curl -X POST https://flakily-vendor-trousers.ngrok-free.dev/api/debug/grant-roles/all-demo-wallets
```

Open: https://pme-financing.vercel.app
MetaMask: Switch to **Sepolia** (Chain ID: 11155111)

`start-sepolia.sh` loads `.env.sepolia`, starts `dotnet run`, waits for `/api/health`, then starts ngrok with `--request-timeout=120s`.

### Local Demo (Ganache)

```bash
./scripts/dev-start.sh
```

Open: http://localhost:4200
MetaMask: Switch to **Localhost 8545** (Chain ID: 1337)

### Required Secrets (gitignored)

Create `.env.sepolia` from `.env.example`:

```bash
DATABASE_URL=postgresql://postgres.melcptpgnohyiyqwpzpe:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require
BLOCKFIN_GOVERNOR_PRIVATE_KEY=0x52c0f8b10c7aabd449a9e03ed2dac4f8cbadc023a8cd13a01eb9d8d46d00fdbc
```

The backend throws `BlockchainException` on startup if `BLOCKFIN_GOVERNOR_PRIVATE_KEY` is missing.

### GitHub Secrets (for CI)

| Secret | Source |
|--------|--------|
| `SONAR_TOKEN` | sonarcloud.io → My Account → Security |
| `CODECOV_TOKEN` | codecov.io → repo → Settings → General |

---

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| Clean Architecture (CQRS) | Separation of concerns, testability, MediatR dispatch |
| MetaMask auth (no passwords) | Blockchain-native — no password storage |
| ERC-721 for assets | NFTs are non-fungible — each physical asset is unique |
| Dual DB (SQL Server / PostgreSQL) | Local dev comfort + free Supabase cloud hosting |
| ngrok static domain | Permanent free URL for exposing the local backend |
| LongPolling for SignalR | More stable than WebSockets through ngrok free tier |
| Soft delete for users | FK constraints on Assets/Loans; audit trail preserved |
| Both `"role"` and `ClaimTypes.Role` claims | `[Authorize(Roles)]` needs the URI form; SignalR hub needs the short form |
| `IConfiguration` for JWT secret | Removes hardcoded credentials (SonarCloud Blocker S6418) |
| `fetch-depth: 0` in CI | Required for SonarCloud blame data and new-code detection |

---

## Hard-Won Lessons

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| PostgreSQL case-sensitivity | Wallet addresses stored mixed-case | `.ToLower()` on both sides in all handler queries |
| Supabase schema skip | Pre-populated schemas fool `HasTables()` | Direct `CreateTablesAsync` scoped to public schema |
| SignalR JWT claim mismatch | `ClaimTypes.Role` URI vs short `"role"` in `FindFirst` | Emit both claim formats in both JWT issuers; hub falls back to `ClaimTypes.Role` |
| SignalR drops on ngrok | ngrok idle timeout kills WebSocket connections | Force LongPolling in production; `--request-timeout=120s` on ngrok |
| ngrok browser warning | ngrok interstitial page blocks fetch requests | Add `ngrok-skip-browser-warning: true` header in `AuthInterceptor` |
| Portfolio chart empty | `doughnutChartData.datasets[0].data = …` mutates in place | Replace entire object reference: `this.doughnutChartData = { … }` |
| ERC-721 approval revert | `approve(loanManager, tokenId)` when already approved → "approval to current owner" | Call `getApproved` first; skip `approve` if already correct |
| FK constraint on user delete | `OnDelete(Restrict)` on Assets/Loans/Profiles | Soft delete: set `IsDeleted = true` on user + assets; keep loans for audit |
| Hardcoded JWT secret | `"SMEFinancingPlatformSuperSecretKey2026!!"` in `VerifySignatureCommandHandler` | Inject `IConfiguration`; read `Jwt:Secret` with `?? throw` |
| OpenZeppelin v4/v5 syntax | `Ownable(msg.sender)` is v5 only — `contracts/` uses v4 | Remove constructor arg for OZ v4 |
| ng2-charts no update | Angular `ngOnChanges` only fires on reference change | Always assign a new `ChartData` object after loading |

---

## API Documentation

Full interactive docs at:
- Local: http://localhost:5002/swagger
- Cloud: https://flakily-vendor-trousers.ngrok-free.dev/swagger *(Development mode only)*

**25 endpoints across 4 tag groups:**

| Tag | Key Endpoints |
|-----|--------------|
| Authentication | `POST /auth/nonce`, `POST /auth/login`, `POST /auth/register`, `POST /auth/logout` |
| Assets | `GET /assets`, `POST /assets`, `POST /assets/{id}/tokenize` |
| Loans | `GET /loans`, `POST /loans`, `POST /loans/{id}/fund`, `POST /loans/{id}/repay`, `POST /loans/{id}/liquidate`, `POST /loans/{id}/back`, `POST /loans/{id}/withdraw-guarantee` |
| Administration | `GET /admin/users`, `DELETE /admin/users/{id}`, `POST /admin/users/{id}/approve`, `GET /admin/stats`, `GET /admin/activity`, `GET /admin/loans/overdue` |

`/api/debug/*` endpoints are blocked at the routing layer in non-Development environments.

---

## Testing

```bash
cd backend && dotnet test
# 52 tests, 0 failures
```

| Test file | Tests | What it covers |
|-----------|-------|----------------|
| `Auth/ApproveUserCommandHandlerTests` | 6 | Approval flow, blockchain role grants, blockchain failure tolerance |
| `Auth/VerifySignatureCommandHandlerTests` | 6 | Signature verification, JWT config injection, missing secret |
| `Admin/DeleteUserCommandHandlerTests` | 3 | Soft delete, asset cascade, Governor protection |
| `Admin/GetAllUsersQueryHandlerTests` | 3 | Pagination, role filter, search |
| `Admin/GetPlatformStatsQueryHandlerTests` | 3 | Stats aggregation |
| `Assets/TokenizeAssetCommandHandlerTests` | 4 | Ownership, tokenId/status update |
| `Assets/GetAssetsByPmeWalletQueryTests` | 3 | Pagination slices |
| `Loans/BackLoanCommandHandlerTests` | 4 | Guarantor backing |
| `Loans/FundLoanCommandHandlerTests` | 5 | Investor funding, status transition |
| `Loans/LiquidateLoanCommandHandlerTests` | 4 | Overdue check, investor ownership |
| `Loans/RepayLoanCommandHandlerTests` | 4 | PME repayment, status guard |
| `Loans/WithdrawGuaranteeCommandHandlerTests` | 4 | Guarantee withdrawal, state checks |
| `UnitTest1` | 1 | Scaffold placeholder |

CI runs automatically on every push via GitHub Actions — backend build + test + SonarCloud analysis, frontend production build, Solidity compile.

---

## Known Limitations & Future Work

| # | Item | Notes |
|---|------|-------|
| 1 | **Backend hosting** | Runs via ngrok from a laptop — not 24/7. Needs cloud hosting (Render/Railway/DigitalOcean) for production availability |
| 2 | **Console logs** | Some `console.log` calls remain in the frontend (auth flows, token debugging) |
| 3 | **Test coverage** | 36% — integration tests (e.g., full MetaMask flow against a test EVM) would significantly improve this |
| 4 | **Interest rate** | Platform is currently zero-interest by design — borrowers repay the exact amount borrowed |
| 5 | **Azure blocked** | Azure for Students subscription policy blocks compute resources; cloud hosting must use another provider |
| 6 | **tokenURI on-chain** | NFT metadata is base64-encoded JSON in the transaction (gas-expensive). A future improvement would pin metadata to IPFS and store `ipfs://` URIs |
| 7 | **Rate limiter** | In-memory counters reset on backend restart. Production would need a Redis-backed rate limiter |

---

## Environment Variables Reference

### Backend

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string — triggers PostgreSQL mode (vs SQL Server) |
| `BLOCKFIN_GOVERNOR_PRIVATE_KEY` | Governor wallet private key for on-chain role grants |
| `ASPNETCORE_ENVIRONMENT` | `Development` enables debug endpoints and test seeder |
| `ContractConfig__AssetTokenAddress` | Override AssetToken contract address |
| `ContractConfig__LoanManagerAddress` | Override LoanManager contract address |
| `ContractConfig__RpcUrl` | Override RPC URL (e.g. Alchemy Sepolia endpoint) |
| `Jwt__Secret` | JWT signing secret (double-underscore = env var format for nested config) |

### Frontend (Vercel build)

| Variable | Description |
|----------|-------------|
| `RAILWAY_BACKEND_URL` | Backend base URL — injected by `sed` during `vercel.json` build step |

The `vercel.json` build command does:
```bash
sed -i "s|RAILWAY_BACKEND_URL_PLACEHOLDER|$RAILWAY_BACKEND_URL|g" frontend/src/environments/environment.production.ts
```

---

## Repository Structure

```
PMEFinancing/
├── backend/
│   ├── src/
│   │   ├── Api/                # Controllers, Hubs, Middleware, Program.cs
│   │   ├── Application/        # CQRS commands/queries/handlers
│   │   ├── Domain/             # Entities, enums
│   │   └── Infrastructure/     # EF Core, Blockchain, Seeder
│   └── tests/Application.Tests/
├── frontend/src/app/
│   ├── core/                   # Shell, auth, interceptors, SignalR
│   ├── governor/               # Admin views
│   ├── pme/                    # SME flows
│   ├── investor/               # Investor flows
│   └── guarantor/              # Guarantor flows
├── contracts/contracts/        # Solidity — RoleManager, AssetToken, LoanManager
├── scripts/
│   ├── start-sepolia.sh        # One-command cloud demo launcher
│   └── dev-start.sh            # One-command local Ganache launcher
├── .github/workflows/ci.yml    # 3-job CI pipeline
├── vercel.json                 # Vercel build + rewrite config
├── docker-compose.yml
├── HANDOVER.md                 # This file
├── SETUP.md                    # Step-by-step setup guide
└── README.md                   # CI badge, quick-start
```

---

## Complete Flow Walkthrough

### 1. Governor approves a new user

1. User visits `/register`, connects MetaMask, fills profile, signs nonce → `POST /api/auth/register` → `User` row created with `IsApproved = false`.
2. Governor logs in (`/login` → nonce → sign → JWT).
3. Governor opens `/governor/registrations` → clicks **Approve**.
4. Backend `ApproveUserCommandHandler` calls `BlockchainService.RegisterUserAsync` and `GrantAssetTokenRoleAsync` using the Governor private key via Nethereum.
5. `User.IsApproved = true` written to DB. User can now log in.

### 2. PME requests a loan

1. PME logs in, creates an asset (`POST /api/assets`), tokenizes it → MetaMask calls `AssetToken.mint()` → `POST /api/assets/{id}/tokenize`.
2. On the Financing tab, PME selects the ATO asset, enters amount and duration.
3. Frontend:
   - Calls `ownerOf(tokenId)` — verifies PME still holds the NFT.
   - Calls `getApproved(tokenId)` — skips `approve()` if LoanManager already approved.
   - MetaMask calls `LoanManager.requestLoan(tokenId, amount, days)` → `LoanRequested` event → `onChainLoanId`.
   - `POST /api/loans` with `{ collateralAssetId, requestedAmount, durationDays, onChainLoanId, transactionHash }`.
4. Backend creates `Loan` (status REQUESTED), sends SignalR notification to `role_investor` and `role_guarantor` groups.

### 3. Investor funds the loan

1. Investor dashboard shows notification badge (SignalR `ReceiveNotification` event).
2. Investor opens Marketplace, finds the loan, clicks **Fund**.
3. `FundLoanDialog` shows exact ETH amount. MetaMask calls `LoanManager.fundLoan(onChainLoanId)` with exact `msg.value`.
4. `POST /api/loans/{id}/fund` → backend updates `Loan.Status = FUNDED`, `Asset.Status = COLLATERAL`.
5. SignalR notification sent to the PME's wallet group.

### 4. PME repays

1. PME sees loan as FUNDED in the Financing tab → clicks **Repay**.
2. MetaMask calls `LoanManager.repayLoan(onChainLoanId)` (payable — sends ETH to contract, which forwards to investor).
3. `POST /api/loans/{id}/repay` → backend updates `Loan.Status = REPAID`, `Asset.Status = ATO`.
4. NFT returned from LoanManager to PME wallet by the smart contract.

---

*This document reflects the state of the project at end of internship. For setup from scratch, see [SETUP.md](SETUP.md).*
