# BlockFin PME — Remaining Work

This document lists everything discovered across the full audit and development sessions that still needs to be built or fixed. Items are ordered by priority within each section.

---

## Section 1 — Must Fix Before Any Demo (Blocking)

These will visibly break or mislead a user during a live demonstration.

### ~~1.1 — On-chain loan funding and repayment are broken~~ **FIXED**
Architecture migrated to MetaMask-signs-everything, matching tokenization:
- `FundLoanAsync` and `RepayLoanAsync` removed from `IBlockchainService` and `BlockchainService`.
- `FundLoanCommandHandler` and `RepayLoanCommandHandler` now only write to DB — no blockchain call.
- `Loan.OnChainLoanId` (long?) added; EF migration `AddOnChainLoanId` created.
- `RequestLoanCommand` carries `OnChainLoanId` + `TransactionHash` from the frontend.
- Frontend `pme-financing.component.ts`: `submitLoanRequest` now calls `LoanManager.requestLoan()` via MetaMask, parses `LoanRequested` event to get on-chain loanId, then POSTs to backend.
- Frontend `fund-loan-dialog.component.ts`: calls `LoanManager.fundLoan(onChainLoanId)` payable via MetaMask, sends exact ETH amount, then POSTs txHash to backend.
- Frontend `repay-loan-dialog.component.ts`: calls `LoanManager.repayLoan(onChainLoanId)` payable via MetaMask, then POSTs txHash to backend.
- `environment.loanManagerAddress` added to `environment.ts` and documented in SETUP.md Section 4.
- `LoanDto` now includes `onChainLoanId` so the investor marketplace can pass it to the fund dialog.
- Tests updated: FundLoan (5 tests) and RepayLoan (4 tests) no longer mock `IBlockchainService`.

### 1.2 — Guarantor role is a complete stub
**What:** The Guarantor role is seeded in the database and can register/login, but has zero business logic behind it. There are no Guarantor endpoints, no handlers, no UI pages, and no smart contract interactions for guarantors.
**Files:** No guarantor-specific files exist beyond `GuarantorProfile.cs` (entity only).
**Fix:** Either implement the full guarantor flow (guarantee a loan, release guarantee on repayment) or remove the Guarantor role from the registration form until it is ready.

### 1.3 — SETUP.md Section 6 shows stale addresses in expected output
**What:** The "Expected output on first start" block in Section 6 still shows `Governor seeded: 0xD42A9cD4638f15Af3F406d76b9c9B940C8437a66` and `Demo PME seeded: 0x627306...` — the old Ganache v6 addresses that no longer match the running system.
**Files:** `SETUP.md` — Section 6.
**Fix:** Update the example output to show the current Ganache v7 Governor address `0xa3BCcC4483444fcf1A9C2781343a8cFaCDE2594D` and PME address `0xD44f328a3887ECa9ef921FA490792d95f99c8906`.

### 1.4 — Section 9 checklist references old Ganache v6 addresses
**What:** Steps 1, 2, and 8 in the Section 9 flow checklist reference `0x627306...` (PME), `0xD42A9c...` (Governor), and `0xf17f52...` (Investor) — all Ganache v6 addresses that produce 0-ETH MetaMask accounts on Ganache v7.
**Files:** `SETUP.md` — Section 9.
**Fix:** Update all address references to the current Ganache v7 accounts and correct the `ganache-cli` command to `ganache`.

---

## Section 2 — Should Fix Before Showing to Anyone External (Security)

### ~~2.1 — Governor private key stored in plaintext config file~~ **FIXED**
`GovernorPrivateKey` removed from `appsettings.json` (now empty string). `BlockchainService` reads it from `appsettings.Development.json` (gitignored) first, then from env var `BLOCKFIN_GOVERNOR_PRIVATE_KEY`. Startup throws `BlockchainException` with a clear message if neither is set. Example file `appsettings.Development.json.example` committed as template. `.gitignore` updated.

### ~~2.2 — Debug endpoints must be hard-removed in production, not just hidden~~ **FIXED**
Added `app.Map("/api/debug/{**path}", ...)` in `Program.cs` that returns 404 for every `/api/debug/*` route when `!app.Environment.IsDevelopment()`. This is belt-and-suspenders on top of the existing `IsDev` guards inside each action. `DebugController.cs` updated with a prominent warning summary comment listing what it exposes and both protection layers.

### ~~2.3 — Full stack trace exposed in error responses~~ **FIXED**
`ExceptionMiddleware` already had the `IsDevelopment()` guard on `stackTrace` from a prior session. This fix tightened the constructor: replaced `IHostEnvironment` with `IWebHostEnvironment` and switched from the Serilog static `Log.Error` to an injected `ILogger<ExceptionMiddleware>` (routed through Serilog automatically via `UseSerilog()`). Stack trace is only in `problemDetails.Extensions["stackTrace"]` when `_env.IsDevelopment()` is true.

### ~~2.4 — `FundLoan` does not validate InvestorWallet against JWT~~ **FIXED**
`LoansController.FundLoan` now overwrites `command.InvestorWallet` from the JWT `wallet` claim before dispatching. `FundLoanCommandHandler` now throws `NotFoundException` / `ForbiddenActionException` for missing loan, wrong status, or unknown investor. Frontend `fund-loan-dialog.component.ts` no longer sends `investorWallet` in the POST body.

### ~~2.5 — No rate limiting on authentication endpoints~~ **FIXED**
`Microsoft.AspNetCore.RateLimiting` (built-in, ASP.NET Core 7+, no new package) wired in `Program.cs` with `app.UseRateLimiter()` after `app.UseAuthentication()`. Three fixed-window policies registered via `RateLimitPolicies` constants (`Api/RateLimitPolicies.cs`):
- `nonce`: 5 req/IP/min — prevents wallet enumeration
- `register`: 3 req/IP/10 min — prevents registration spam
- `login`: 10 req/IP/min — more lenient; user may retry after nonce expiry
`[EnableRateLimiting]` applied to `GetNonce`, `Register`, and `Login` in `AuthController.cs`. `Logout` is deliberately excluded so users can always log out regardless of rate limit state. `OnRejected` returns a JSON body `{ status, message, retryAfterSeconds }` instead of an empty 429.

---

## Section 3 — Nice to Have (Polish)

### 3.1 — tokenURI uses base64 data URI instead of IPFS
**What:** When a PME tokenizes an asset, the minted NFT's `tokenURI` is a `data:application/json;base64,...` string embedded directly in the blockchain transaction. This is expensive in gas, not persistent if the contract is re-deployed, and not interoperable with NFT marketplaces that expect an IPFS URI.
**Files:** `frontend/src/app/pme/tokenize-asset-dialog.component.ts`.
**Fix:** Upload metadata JSON to IPFS (Pinata, Infura IPFS, or a local IPFS node) before minting, and pass the resulting `ipfs://Qm...` URI as the `tokenURI`. An IPFS service call can be added in the dialog component before the MetaMask transaction.

### 3.2 — No pagination on assets and loans tables
**What:** The PME assets table, investor marketplace, and financing tabs load all records in a single query with no limit. With a large dataset, this will be slow and the UI will overflow.
**Files:** `backend/src/Application/Assets/Queries/GetAssetsByPmeWalletQuery.cs`, `backend/src/Application/Loans/Queries/GetRequestedLoansQuery.cs`, and the corresponding Angular components.
**Fix:** Add `Skip`/`Take` parameters to the queries and `[FromQuery] int page = 1, int pageSize = 20` to the controllers. The Angular Material `MatPaginator` is already imported in `pme-assets.component.ts` — wire it up to the server-side query.

### 3.3 — No email or notification when loan is funded or repaid
**What:** A PME has no way to know their loan was funded by an investor other than manually polling the UI. Similarly, an investor is not notified when a loan they funded is repaid.
**Files:** No notification service exists yet.
**Fix:** Add a background notification service (email via SendGrid/SMTP, or in-app websocket notification) triggered from `FundLoanCommandHandler` and `RepayLoanCommandHandler` after the DB write.

### ~~3.4 — `repayLoan()` in the PME financing component is not implemented~~ **FIXED**
`RepayLoanDialogComponent` created at `frontend/src/app/pme/repay-loan-dialog.component.ts`. Shows loan summary, calls `POST /api/loans/{id}/repay`, uses tx-feedback for state. `pme-financing.component.ts` now opens the dialog and updates the local list on success.

### ~~3.5 — `RepayLoanCommandHandler` does not guard on loan status~~ **FIXED**
`RepayLoanCommandHandler` now throws `NotFoundException` for missing loan, `ForbiddenActionException` for wrong status (must be FUNDED) and wrong owner. `RepayLoanCommand` has `PmeWallet`; controller overwrites it from JWT.

### ~~3.6 — No loading / error states on most list views~~ **FIXED**
`LoadingOrEmptyComponent` created at `frontend/src/app/shared/loading-or-empty.component.ts` — standalone three-state component (loading/empty/error) with spinner, retry button, and customisable text. Exported from `SharedModule`. Applied to all list/table views:
- `pme-assets.component.ts`: `loadingState` replaces old `dataSource.data.length === 0` guard; "Add asset" button disabled while loading; specific error message on failure.
- `pme-financing.component.ts`: `loansLoadingState` guards the "My loan requests" table; `loadLoanRequests()` made public for retry callback.
- `investor-marketplace.component.ts`: Initial load tracked with `loadingState`; background interval refresh runs silently without resetting loading state; filter-empty case shows a separate `app-empty-state`.
- `governor-registrations.component.ts`: `loading: boolean` replaced with `loadingState`; `MatProgressSpinnerModule` removed (spinner now inside `LoadingOrEmptyComponent`).
- `governor-access.component.ts`: `loadingState` added; table hidden until loaded; empty and error states shown via `LoadingOrEmptyComponent`.

---

## Section 5 — Findings from Final Health Check

### ~~5.1 — No automated tests~~ **FIXED**
`backend/tests/Application.Tests/` created — xUnit project with 19 tests across 4 handlers (`TokenizeAssetCommandHandler` ×4, `ApproveUserCommandHandler` ×6, `FundLoanCommandHandler` ×4, `RepayLoanCommandHandler` ×4, plus 1 extra). All 19 pass: `dotnet test` → **Failed: 0, Passed: 19**. Three genuine handler bugs fixed in the process (see below).

**Bugs fixed while writing tests:**
- `TokenizeAssetCommand` was missing the `PmeWallet` property — handler had no ownership check at all.
- `TokenizeAssetCommandHandler` threw a generic `Exception("Asset not found")` instead of `NotFoundException`.
- `ApproveUserCommandHandler` threw `KeyNotFoundException` instead of `NotFoundException`; also had ambiguous `ValidationException` (removed `using System.ComponentModel.DataAnnotations`).

### ~~5.2 — Frontend production build fails (CSS budget errors)~~ **FIXED**
`anyComponentStyle` budget in `frontend/angular.json` raised from `maximumWarning: 2kb / maximumError: 4kb` to `maximumWarning: 8kb / maximumError: 16kb`. `ng build --configuration production` now succeeds.

### ~~5.3 — `System.IdentityModel.Tokens.Jwt` has known vulnerability~~ **FIXED**
`System.IdentityModel.Tokens.Jwt` and `Microsoft.IdentityModel.Tokens` upgraded from `7.0.3` → `7.3.1` in `Api.csproj`. `System.IdentityModel.Tokens.Jwt` upgraded from `7.0.3` → `7.3.1` in `Application.csproj`. `dotnet build` no longer reports NU1902. Infrastructure and test projects had no pinned JWT packages.

---

## Section 4 — Known Limitations (By Design for Now)

### 4.1 — No interest rate calculation
**What:** The loan interest rate is hardcoded at 8% (`amount * 0.08`) in the frontend summary card. This is not stored in the database or on-chain, and is not enforced during repayment — a PME can repay any `amountEth` they choose.
**Files:** `frontend/src/app/pme/pme-financing.component.ts` (line 268), `backend/src/Application/Loans/Handlers/RepayLoanCommandHandler.cs`.
**Rationale:** Interest calculation was intentionally left as a display-only estimate until a pricing model is agreed.

### 4.2 — No partial repayment support
**What:** The `repayLoan` flow expects a single full payment. There is no concept of installments, minimum monthly payment, or partial repayment recorded in the database.
**Files:** `backend/src/Domain/Entities/Loan.cs`, `backend/src/Application/Loans/Handlers/RepayLoanCommandHandler.cs`.
**Rationale:** Full repayment-in-one-shot was chosen to keep the MVP simple. The LoanManager smart contract also does not support partial repayment.

### 4.3 — No loan default / liquidation flow in the UI
**What:** `AssetToken.sol` has a `LIQUIDATED` status enum value, and the smart contract supports collateral liquidation in principle. However, no backend handler, no endpoint, and no UI page exists for triggering or processing liquidation when a loan goes past its duration.
**Files:** `backend/src/Domain/Entities/Asset.cs` (`AssetStatus.LIQUIDATED` exists), `contracts/contracts/AssetToken.sol` (Status enum).
**Rationale:** Liquidation requires a time-oracle or manual Governor trigger. Deferred pending legal review of what constitutes default in the target jurisdiction.

### 4.4 — Single-asset collateral only
**What:** Each loan can have exactly one collateral asset (`CollateralAssetId` is a single foreign key on `Loan`). Multi-asset collateral is not supported.
**Files:** `backend/src/Domain/Entities/Loan.cs`, `backend/src/Application/Loans/Commands/RequestLoanCommand.cs`.
**Rationale:** The smart contract and data model were designed for the MVP single-asset case. Extending to multi-asset requires a separate collateral junction table and contract changes.

### 4.5 — RoleManager on-chain registration is best-effort for PME/Investor/Guarantor
**What:** When the Governor approves a user, `RegisterUserAsync` calls the `RoleManager` contract to record the role on-chain. This call is wrapped in a try-catch — if it fails, the approval still succeeds in the database. The on-chain RoleManager state and the database may diverge silently.
**Files:** `backend/src/Application/Auth/Handlers/ApproveUserCommandHandler.cs`.
**Rationale:** The RoleManager on-chain call is informational for a future decentralised audit trail. The `AssetToken.grantRole(PME)` call (which actually gates minting) is the critical path and it is also wrapped separately.
