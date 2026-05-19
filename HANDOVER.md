# BlockFin PME — Developer Handover

---

## Section 1 — Project Overview

BlockFin PME is a blockchain-backed lending platform that lets small and medium enterprises (SMEs) tokenize their physical assets as NFTs and use those NFTs as collateral to borrow ETH directly from investors — without a bank intermediary. Every critical transaction (asset minting, loan request, funding, repayment) is signed on-chain via MetaMask and recorded in both SQL Server and the local Ethereum node (Ganache).

**Governor** is the platform administrator. There is exactly one Governor account, seeded on first start. The Governor approves or rejects newly registered users. On approval, the Governor's private key signs an on-chain `grantRole(PME)` call that allows the approved user to mint NFTs on the AssetToken contract.

**PME** (Petite et Moyenne Entreprise) is an SME company account. A PME registers, waits for Governor approval, then creates assets (physical property, equipment, etc.), tokenizes each as an ERC-721 NFT, and requests ETH loans by depositing an NFT as collateral into the LoanManager contract. On repayment, the NFT is returned.

**Investor** is a capital provider. An Investor browses the marketplace of open loan requests and funds one by sending exact ETH to the LoanManager contract via MetaMask. After the PME repays, the Investor receives principal plus interest. If the loan goes past its due date, the Investor can liquidate the collateral NFT.

**Guarantor** is a partially-implemented fourth role. Guarantors can register and log in, but no business logic, smart contract interactions, or UI pages exist for them beyond the `GuarantorProfile` entity. This role must be implemented or removed from the registration form before any external demo.

---

## Section 2 — Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌───────────────────┐    ┌──────────────────────────────┐  │
│  │  Angular 17       │    │  MetaMask Extension          │  │
│  │  :4200            │◄──►│  ethers.js BrowserProvider   │  │
│  └────────┬──────────┘    └──────────────┬───────────────┘  │
└───────────┼─────────────────────────────┼──────────────────-┘
            │ HTTP/JSON REST               │ eth_sendTransaction
            ▼                             ▼
┌───────────────────┐         ┌────────────────────────────────┐
│  ASP.NET Core 8   │         │  Ganache :8545 (local EVM)     │
│  :5002            │         │                                │
│  CQRS / MediatR   │         │  ┌─────────────┐              │
│  EF Core 8        │         │  │ RoleManager │ (AccessCtrl) │
│  Nethereum        ├────────►│  ├─────────────┤              │
│  JWT Auth         │ JSON-RPC│  │ AssetToken  │ (ERC-721)    │
│  Rate Limiter     │         │  ├─────────────┤              │
└────────┬──────────┘         │  │ LoanManager │ (payable)    │
         │                   │  └─────────────┘              │
         ▼                   └────────────────────────────────┘
┌───────────────────┐
│  SQL Server       │
│  :1433            │
│  Users, Assets,   │
│  Loans, Nonces    │
└───────────────────┘
```

- **MetaMask signs all user transactions.** Tokenize, requestLoan, fundLoan, and repayLoan are all submitted directly from the browser to Ganache via MetaMask. The backend receives only the resulting `txHash` and any emitted event data (e.g., `tokenId`, `onChainLoanId`).
- **Governor signs server-side.** When the Governor approves a user, the backend uses the Governor private key (from `appsettings.Development.json` or `BLOCKFIN_GOVERNOR_PRIVATE_KEY`) to call `grantRole(PME)` on AssetToken via Nethereum. This gates NFT minting at the contract level.
- **Backend never holds user private keys.** The DB stores wallet addresses and transaction hashes — not secrets. Private keys for PME/Investor/Guarantor accounts never leave MetaMask.

---

## Section 3 — Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend framework | Angular | 17 | SPA shell, routing, DI |
| UI components | Angular Material | 17 | Tables, dialogs, paginators, spinners |
| Blockchain client | ethers.js | 6.x | MetaMask BrowserProvider, contract calls |
| Backend framework | ASP.NET Core | 8.0 | REST API, middleware pipeline |
| ORM | EF Core | 8.0 | SQL Server migrations, LINQ queries |
| Mediator / CQRS | MediatR | 12.x | Command/Query dispatch, handler isolation |
| Blockchain RPC | Nethereum | 4.x | Server-side contract calls (Governor signing) |
| Database | SQL Server | 2022 | Persistent user/asset/loan data |
| Local EVM | Ganache | 7.x | Deterministic Ethereum node for development |
| Contract deployment | Truffle | 5.x | Compile, migrate, ABI generation |
| Smart contract libs | OpenZeppelin | 4.x | ERC-721, AccessControl, ReentrancyGuard |
| Unit testing | xUnit | 2.x | Test runner |
| Mocking | Moq | 4.x | Interface mocks in unit tests |
| Assertions | FluentAssertions | 6.x | Readable test assertions |

---

## Section 4 — Smart Contracts

### RoleManager

Tracks which wallets hold which platform roles (PME, INVESTOR, GUARANTOR, GOVERNOR) on-chain. Built on OpenZeppelin AccessControl.

| Function | Caller | Effect |
|----------|--------|--------|
| `registerUser(address, bytes32 role)` | Governor (server-side) | Grants role on-chain |
| `revokeUser(address)` | Governor | Revokes role |
| `hasRole(bytes32, address)` | Anyone | View check |

Events: `UserRegistered(address, bytes32 role)`, `UserRevoked(address)`.

### AssetToken

ERC-721 NFT contract. Minting is gate-kept by the PME role granted through RoleManager. Each NFT represents one physical asset and carries metadata as a `tokenURI`.

| Function | Caller | Effect |
|----------|--------|--------|
| `mint(pmeAddress, tokenURI, assetType)` | PME (MetaMask) | Mints NFT, returns `tokenId` |
| `setStatus(tokenId, newStatus)` | Governor (server-side) | Updates asset status enum |
| `isPme(address)` | Backend | View: checks PME role |

Events: `AssetTokenized(pmeAddress, tokenId, assetType)`, `AssetStatusUpdated(tokenId, newStatus)`.

**Current limitation:** `tokenURI` is a `data:application/json;base64,...` string embedded in the transaction. Gas-expensive and not IPFS-compatible. See §7.

### LoanManager

Manages the full loan lifecycle on-chain. Holds NFT collateral during the loan period. Uses a monotonic `_nextLoanId` counter (not ERC-721 token IDs).

| Function | Caller | Constraint |
|----------|--------|-----------|
| `requestLoan(collateralTokenId, amount, durationDays)` | PME | Must hold PME role; transfers NFT to contract |
| `fundLoan(loanId)` payable | Investor | `msg.value` must equal `loan.amount` exactly |
| `repayLoan(loanId)` payable | PME | `msg.value >= loan.amount`; excess returned |
| `liquidateCollateral(loanId)` | Investor | Only after `dueAt` has passed |

Events: `LoanRequested(loanId, pme, collateralTokenId, amount, durationDays)`, `LoanFunded(loanId, investor)`, `LoanRepaid(loanId)`, `CollateralLiquidated(loanId, investor)`.

**Critical:** `fundLoan` reverts if `msg.value != loan.amount`. The frontend must send exact wei — it reads `loan.requestedAmount` from the API and passes it as the transaction value.

### Unintegrated Contracts

- **FinancingToken** — ERC-20 token (burnable, ownable). Deployed but not wired to any backend handler or frontend flow.
- **LoanPool** — Deployed but not wired up. Presumably intended as a liquidity pool for FinancingToken.

---

## Section 5 — Complete Flow Walkthrough

1. **[Governor]** Backend starts, `DatabaseSeeder` creates the Governor account in SQL Server. The Governor's wallet (`0xa3BCcC...`) is pre-configured in `appsettings.json`.

2. **[PME]** Navigates to `/register`, connects MetaMask (wallet `0xD44f...`), fills company details, clicks Register. Frontend calls `POST /api/auth/nonce` to get a challenge string, signs it with MetaMask (proves wallet ownership), then calls `POST /api/auth/register` with the signature. Backend verifies the signature and creates a `User` record with `IsApproved = false`.

3. **[Governor]** Logs in via MetaMask nonce-sign flow. Opens the Governor dashboard → Pending Users. Clicks **Approve** on the PME. Backend handler calls `AssetToken.grantRole(PME, pmeWallet)` using the Governor private key via Nethereum. This is the only server-side blockchain call in the system. User is marked `IsApproved = true` in SQL Server.

4. **[PME]** Logs in. Dashboard → Assets → **Add Asset**. Fills name, type, estimated value. `POST /api/assets` writes an `Asset` record with `Status = REGISTERED` and no `TokenId`.

5. **[PME]** Clicks **Tokenize** on the asset. Frontend builds a `tokenURI` (base64 JSON metadata), calls `AssetToken.mint(pmeWallet, tokenURI, assetType)` via MetaMask. On-chain confirmation returns a `tokenId` from the `AssetTokenized` event. Frontend then calls `POST /api/assets/{id}/tokenize` with `{ txHash, tokenId }`. Backend updates `Asset.Status = ATO` and `Asset.TokenId = tokenId`.

6. **[PME]** Dashboard → Financing → **Request Loan** on the tokenized asset. Enters amount (ETH) and duration (days). Frontend calls `LoanManager.requestLoan(tokenId, amount, durationDays)` via MetaMask — this transfers the NFT to the contract as collateral. The `LoanRequested` event returns an `onChainLoanId`. Frontend then calls `POST /api/loans` with `{ onChainLoanId, txHash, amount, durationDays, collateralAssetId }`. Backend creates a `Loan` record with `Status = REQUESTED` and updates `Asset.Status = COLLATERAL`.

7. **[Investor]** Logs in. Dashboard → Marketplace. Sees the loan listed with risk score and LTV. Clicks **Fund**. Dialog shows the exact ETH amount required. Investor clicks Confirm → MetaMask prompts for a payable transaction to `LoanManager.fundLoan(onChainLoanId)` with exact `msg.value`. On success, frontend calls `POST /api/loans/{id}/fund` with `{ txHash }`. Backend updates `Loan.Status = FUNDED` in SQL Server.

8. **[PME]** Returns to the Financing tab. Sees the loan as FUNDED. Clicks **Repay**. Dialog shows the repayment amount. MetaMask prompts for a payable call to `LoanManager.repayLoan(onChainLoanId)`. Contract sends principal to investor and returns the NFT to the PME wallet. Frontend calls `POST /api/loans/{id}/repay` with `{ txHash }`. Backend updates `Loan.Status = REPAID` and `Asset.Status = ATO`.

---

## Section 6 — What Was Fixed During This Internship

| Bug / Issue | What Was Wrong | What Was Done |
|-------------|---------------|---------------|
| On-chain signing broken | `fundLoan` and `repayLoan` called Nethereum with no private key — all blockchain calls failed silently | Removed server-side fund/repay; frontend now calls LoanManager via MetaMask, posts only txHash |
| OnChainLoanId not tracked | Backend had no field for the LoanManager's loan counter; fund/repay had no way to reference on-chain loans | Added `OnChainLoanId (long?)` to `Loan` entity, EF migration, and all request/response DTOs |
| Wrong ABI bytes32 encoding | Role bytes32 (`"PME"` etc.) were not properly padded, causing `grantRole` to revert | Fixed Nethereum encoding to right-pad strings to 32 bytes |
| Asset status not updated | Tokenize and loan lifecycle did not update `Asset.Status` — assets stayed `REGISTERED` forever | `TokenizeAssetCommandHandler` sets `ATO`; `RequestLoan` sets `COLLATERAL`; `Repay` resets to `ATO` |
| FundLoan no ownership check | Any authenticated user could fund any loan by sending any wallet address in the body | Controller overwrites `InvestorWallet` from JWT claim; handler validates investor exists in DB |
| RepayLoan no status guard | `repayLoan` would update any loan regardless of current status | Handler now throws `ForbiddenActionException` unless `Loan.Status == FUNDED` and caller is the PME owner |
| Repay button was a stub | `repayLoan()` in `pme-financing.component.ts` was a `console.log` placeholder | Full `RepayLoanDialogComponent` created; MetaMask flow + POST to backend + list refresh |
| Governor private key in config | `GovernorPrivateKey` was stored in `appsettings.json` (committed to git) | Key removed from JSON; must be in gitignored `appsettings.Development.json` or env var; startup throws if missing |
| Stack trace in prod responses | `ExceptionMiddleware` always included stack trace in API error bodies | Stack trace only included when `IsDevelopment()` is true |
| Debug endpoints in production | `/api/debug/*` was reachable in any environment | Added route-level 404 block for non-Development; controller also guards internally |
| JWT library vulnerability | `System.IdentityModel.Tokens.Jwt` 7.0.3 had known CVE (NU1902 warning) | Upgraded to 7.3.1 in all projects |
| No rate limiting on auth | `/api/auth/nonce` and `/api/auth/register` had no throttling | Fixed-window rate limiter: 5/min nonce, 3/10min register, 10/min login; returns JSON 429 with retry-after |
| No automated tests | Zero tests existed | 23 xUnit tests across 5 handlers/queries; 3 handler bugs found and fixed during test writing |
| No loading states | All list views showed empty tables during fetch; no error feedback | `LoadingOrEmptyComponent` added; applied to all 5 list views with spinner, empty state, error + retry |
| No pagination | All queries returned all rows; large datasets would overflow | Server-side `Skip`/`Take` on assets, loans, and users queries; Angular Material `MatPaginator` on all tables |
| CSS budget error | `ng build --configuration production` failed with component style budget exceeded | `anyComponentStyle` budget raised to 16kb in `angular.json` |
| SETUP.md stale addresses | Section 6 and Section 9 referenced Ganache v6 addresses | Updated all addresses and commands to Ganache v7 values |

---

## Section 7 — What Still Needs to Be Built

### Guarantor role has no business logic (§1.2)

**What:** Guarantors can register and log in. Nothing else works. There are no Guarantor endpoints, handlers, smart contract interactions, or UI pages.

**Why it matters:** The role is visible on the registration form. Users selecting "Guarantor" will register successfully and then see a blank dashboard with no actions available.

**Files to touch:** Create `GuarantorController.cs`, handler classes under `Application/Guarantors/`, a Guarantor dashboard component in Angular, and extend `LoanManager.sol` if on-chain guarantee logic is required.

**Suggested approach:** The fastest safe fix is to hide the Guarantor option from the registration form (`frontend/src/app/auth/register.component.ts`) until the role is implemented. Full implementation requires deciding what "guarantee" means contractually — whether it is a separate on-chain pledge, a co-signer on the loan, or a DB-only record.

**Complexity:** Large (full implementation) / Small (hide from UI)

---

### tokenURI should use IPFS instead of base64 data URI (§3.1)

**What:** The NFT metadata is currently Base64-encoded JSON embedded directly in the mint transaction as a `data:application/json;base64,...` string.

**Why it matters:** On-chain data URIs are gas-expensive, are lost if the contract is redeployed, and are not compatible with NFT marketplaces or wallets that expect `ipfs://` URIs.

**Files to touch:** `frontend/src/app/pme/tokenize-asset-dialog.component.ts` — before calling `AssetToken.mint()`, upload the metadata JSON to IPFS and pass the resulting `ipfs://Qm...` URI as `tokenURI`.

**Suggested approach:** Use the Pinata SDK or `ipfs-http-client` to pin the JSON object to IPFS from the browser before the MetaMask transaction. The metadata structure (`name`, `description`, `assetType`, `estimatedValue`) stays unchanged — only the URI format changes.

**Complexity:** Medium

---

### No notifications when loan is funded or repaid (§3.3)

**What:** PMEs have no way to know their loan was funded other than manually reloading the page. Investors are not notified when a loan they funded is repaid.

**Why it matters:** In a real deployment, the time between loan funding and the PME discovering it could be hours or days. The same applies to investors waiting for repayment.

**Files to touch:** `FundLoanCommandHandler.cs` and `RepayLoanCommandHandler.cs` — add a notification call after the DB write. Create a new `INotificationService` interface in `Application`.

**Suggested approach:** Start with email via an SMTP client (SendGrid, Mailgun, or direct SMTP). The handler resolves the recipient's email from the `User` entity (already in DB), constructs the message, and fires the send asynchronously. For real-time in-app alerts, add a SignalR hub and push from the handler — but email is lower risk and works without a persistent connection.

**Complexity:** Medium

---

### governor-access component has no backend endpoint

`frontend/src/app/governor/governor-access.component.ts` calls `GET /api/governor/access` on load and gets a 404 on every request. There is no controller, handler, or query for this endpoint. The component silently shows an empty list. A new developer will notice the 404 in the browser console and spend time looking for code that does not exist.

---

## Section 8 — Test Coverage

All 23 tests are in `backend/tests/Application.Tests/`. Run with `dotnet test` from the `backend/` directory.

### TokenizeAssetCommandHandler (4 tests)

Protects: ownership check (PME must own the asset), `NotFoundException` for missing asset, and correct `TokenId`/`Status` update on success.

- `Handle_ValidCommand_SetsTokenIdAndStatusAto`
- `Handle_AssetNotFound_ThrowsNotFoundException`
- `Handle_WrongPmeWallet_ThrowsForbiddenActionException`
- `Handle_AlreadyTokenized_ThrowsForbiddenActionException`

### ApproveUserCommandHandler (6 tests)

Protects: user must exist, user must be pending (not already approved), `GrantAssetTokenRoleAsync` is called for PME role, `RegisterUserAsync` is called on RoleManager, correct `IsApproved` flag written to DB.

- `Handle_ValidApproval_SetsIsApprovedTrue`
- `Handle_UserNotFound_ThrowsNotFoundException`
- `Handle_AlreadyApproved_ThrowsForbiddenActionException`
- `Handle_PmeRole_CallsGrantAssetTokenRole`
- `Handle_NonPmeRole_DoesNotCallGrantAssetTokenRole`
- `Handle_BlockchainFailure_StillApprovesInDb`

### FundLoanCommandHandler (5 tests)

Protects: loan must exist, loan must be in REQUESTED status, investor must exist in DB, `Loan.Status` transitions to FUNDED, `Loan.InvestorId` is set correctly.

- `Handle_ValidFund_SetsStatusFunded`
- `Handle_LoanNotFound_ThrowsNotFoundException`
- `Handle_LoanNotRequested_ThrowsForbiddenActionException`
- `Handle_InvestorNotFound_ThrowsNotFoundException`
- `Handle_ValidFund_SetsInvestorId`

### RepayLoanCommandHandler (4 tests)

Protects: loan must exist, loan must be in FUNDED status, only the PME who requested the loan can repay it, `Loan.Status` transitions to REPAID.

- `Handle_ValidRepay_SetsStatusRepaid`
- `Handle_LoanNotFound_ThrowsNotFoundException`
- `Handle_LoanNotFunded_ThrowsForbiddenActionException`
- `Handle_WrongPmeWallet_ThrowsForbiddenActionException`

### GetAssetsByPmeWalletQuery (3 tests)

Protects: pagination returns correct slices, unknown wallets return empty results, `HasNextPage`/`HasPreviousPage` flags are correct.

- `Handle_Page1_ReturnsFirstTen`
- `Handle_Page2_ReturnsCorrectSlice`
- `Handle_UnknownWallet_ReturnsEmptyResult`

### Placeholder

- `UnitTest1` — empty test in the project scaffold, harmless.

**Not covered and should be added next:**
- `GetRequestedLoansQueryHandler` — the PME vs marketplace conditional filter is untested
- `RequestLoanCommandHandler` — no tests at all
- `LoginCommandHandler` / `RegisterUserCommandHandler` — auth flow has no unit tests
- Integration tests for the MetaMask-signs-everything flow (requires a test EVM node)

---

## Section 9 — Known Gotchas

**Ganache v6 vs v7** — The same BIP-39 mnemonic (`candy maple cake sugar pudding...`) produces completely different account addresses in Ganache v6 (`ganache-cli`) and v7 (`ganache`). This project uses v7. If you have v6 installed, the Governor address in `appsettings.json` will not match the deployer, `grantRole` will revert, and PME minting will silently fail. Verify with `ganache --version` — must show `7.x.x`.

**Contract addresses change on every `truffle migrate --reset`** — Each migration deploys new contracts at new addresses. Two files must be updated manually: `backend/src/Api/appsettings.json` (ContractConfig section) and `frontend/src/environments/environment.ts`. The `scripts/dev-start.sh` script patches these automatically using `sed`. If you run `truffle migrate --reset` by hand and forget to update the configs, all blockchain calls will fail with `sender account not recognized` or silent reverts.

**Governor private key is not in `appsettings.json`** — The key must be in `backend/src/Api/appsettings.Development.json` (gitignored) or the `BLOCKFIN_GOVERNOR_PRIVATE_KEY` environment variable. The backend throws a `BlockchainException` with a clear message on startup if neither is set. After cloning fresh or pulling new code, copy the example file: `cp backend/src/Api/appsettings.Development.json.example backend/src/Api/appsettings.Development.json` and paste the Ganache accounts[0] private key.

**OnChainLoanId is null for seeded test loans** — The `TestDataSeeder` creates `Loan` records directly in SQL Server without going through MetaMask or LoanManager. These loans have `OnChainLoanId = null`. If you try to fund or repay a seeded loan from the UI, the MetaMask call will fail because no on-chain loan exists. Always test the full loan flow with a freshly registered user, not seeded data.

**MetaMask must be on Chain ID 1337** — Ganache uses Chain ID 1337. If MetaMask is connected to Ethereum mainnet, a testnet, or any other chain, transaction signing will either fail with a network mismatch error or silently submit to the wrong chain. Add the network manually: Settings → Networks → Add → RPC URL `http://127.0.0.1:8545`, Chain ID `1337`.

**Rate limiter resets on backend restart** — Rate limit counters (`nonce`: 5/min, `register`: 3/10min, `login`: 10/min) are stored in-memory in the ASP.NET process. Restarting the backend clears all counters. This is fine for development. A production deployment would need a Redis-backed rate limiter (replace `AddFixedWindowLimiter` with a distributed implementation).

**`dotnet ef database update` required after pulling new migrations** — If the DB schema is behind the code, EF Core will throw on startup. Run from `backend/src/`:
```bash
dotnet ef database update --project Infrastructure --startup-project Api
```

---

## Section 10 — How to Run Everything

See [SETUP.md](SETUP.md) for full step-by-step instructions. The quickest path is:

```bash
./scripts/dev-start.sh
```

This starts Ganache, deploys contracts, patches config files, starts the backend, and starts the frontend automatically.

**Service URLs:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:5002/api |
| Swagger UI | http://localhost:5002/swagger |
| Ganache RPC | http://127.0.0.1:8545 |

**MetaMask accounts (Ganache v7 — candy maple mnemonic):**

| Role | Address | Private Key |
|------|---------|-------------|
| Governor | `0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D` | Ganache output [0] |
| PME | `0xD44f328a3887ECa9ef921FA490792d95f99c8906` | Ganache output [1] |
| Investor | `0xCe8AfFdBdbdc02151784037Dba132b6447Abe37A` | Ganache output [2] |
| Guarantor | `0xc4b418aCF701CFd3bFdEfd688323442866222218` | Ganache output [3] |

Private keys are printed to the terminal when Ganache starts. Import each into MetaMask via **Account → Import Account → Private Key**.
