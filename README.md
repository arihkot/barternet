# BarterNet

**Cross-Merchant Loyalty Liquidity Engine**

BarterNet lets independent small merchants each mint their own loyalty token, while letting consumers spend those points **outside** the business that issued them. A customer earns "Coffee Points" at a cafe and can redeem a discount at the bookstore next door — because BarterNet routes the exchange through an on-chain hub-and-spoke AMM instead of bilateral partnership agreements.

## Deployed URL
https://barternet.pages.dev

## Demo
<img width="1470" height="956" alt="Screenshot 2026-07-05 at 1 55 44 PM" src="https://github.com/user-attachments/assets/cf534bb3-6d38-44c9-b6b9-a5c4539f020c" />
<img width="1582" height="1035" alt="Screenshot 2026-07-05 at 1 54 47 PM" src="https://github.com/user-attachments/assets/812e43f1-728c-40cf-a560-5307291afe2d" />
<img width="1582" height="1035" alt="Screenshot 2026-07-05 at 1 54 41 PM" src="https://github.com/user-attachments/assets/6194f810-50ab-4333-8c73-90b6167b9328" />
<img width="1582" height="1035" alt="Screenshot 2026-07-05 at 1 54 36 PM" src="https://github.com/user-attachments/assets/04101d0a-a3e5-4f0a-877e-6bd109b7e5dc" />
<img width="1582" height="1035" alt="Screenshot 2026-07-05 at 1 54 32 PM" src="https://github.com/user-attachments/assets/a1b67806-e8f3-40ed-a0d9-cc3642c38058" />
<img width="1582" height="1035" alt="Screenshot 2026-07-05 at 1 45 06 PM" src="https://github.com/user-attachments/assets/3d398c5b-d912-48c7-8667-328cc950167d" />

## Mobile Responsive
<img width="338" height="724" alt="Screenshot 2026-07-05 at 8 18 10 PM" src="https://github.com/user-attachments/assets/a34bda83-b267-4dae-9bcf-65130940d470" />
<img width="338" height="724" alt="Screenshot 2026-07-05 at 8 17 49 PM" src="https://github.com/user-attachments/assets/3180c032-ab3e-4daa-b8d5-5fa35a88bdcf" />
<img width="338" height="724" alt="Screenshot 2026-07-05 at 8 17 44 PM" src="https://github.com/user-attachments/assets/8f27c515-112d-41f6-b881-11f809681c2a" />
<img width="338" height="724" alt="Screenshot 2026-07-05 at 8 16 44 PM" src="https://github.com/user-attachments/assets/15525359-48d0-4d58-bb4e-925056b3b341" />

## CI/CD
<img width="1582" height="1035" alt="Screenshot 2026-07-05 at 8 21 11 PM" src="https://github.com/user-attachments/assets/56e5c979-e1fa-47a5-aa33-96338755899e" />


## Tests
<img width="1372" height="560" alt="image" src="https://github.com/user-attachments/assets/8bdb5cdd-9365-4728-a09a-2851e3de25fc" />
<img width="2608" height="1586" alt="image" src="https://github.com/user-attachments/assets/4ea2fb60-31bf-4e26-9986-308646a407c5" />


## Demo Video
https://drive.google.com/file/d/1-0Zz936myHK5V8nY1-0LuUpi72w-tQ5q/view?usp=sharing

## How It Works

1. **Issuance** — Merchants mint a branded fungible token (SEP-41) through a factory contract, with zero smart-contract code to write themselves.
2. **Liquidity** — Every merchant token is paired against a common hub asset (native XLM) in a constant-product AMM, so any token can be swapped into any other token in one atomic routed transaction.
3. **Redemption** — Merchants publish a redemption catalog (item → price in their own token); consumers redeem directly on-chain, and the contract enforces stock and transfers tokens atomically.

## Pitch Deck
https://drive.google.com/file/d/1vDLosqYKj7OD_qFthN2C0Nne97CQmQD_/view?usp=sharing

## Wallet Integration

The frontend connects to the [Freighter](https://freighter.app) browser extension using [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api). The integration is implemented in the following files:

| File | Purpose |
|---|---|
| [`frontend/src/lib/wallet.ts`](./frontend/src/lib/wallet.ts) | Low-level Freighter API wrapper: `isWalletInstalled`, `requestWalletAccess`, `getWalletAddress`, `getWalletNetwork`, and `signWalletTransaction` |
| [`frontend/src/context/WalletContext.tsx`](./frontend/src/context/WalletContext.tsx) | React context that exposes `connect`, `disconnect`, and `signTransaction` to the rest of the app |
| [`frontend/src/components/WalletButton.tsx`](./frontend/src/components/WalletButton.tsx) | Connect/disconnect button rendered in the navbar |
| [`frontend/src/test/wallet.test.ts`](./frontend/src/test/wallet.test.ts) | Unit tests for the wallet service |
| [`frontend/src/test/WalletButton.test.tsx`](./frontend/src/test/WalletButton.test.tsx) | Component tests for the connect button |

### Freighter Permissions & Flow

- **Connection / authorization**: `requestAccess()` prompts the user to authorize the dApp. This is the modern Freighter API v4.0+ replacement for the deprecated `setAllowed` flow.
- **Address retrieval**: `getAddress()` returns the active Stellar public key.
- **Network enforcement**: `getNetwork()` is read after connection and the app rejects non-Testnet networks.
- **Transaction signing**: `signTransaction(xdr, { networkPassphrase })` is called after a Soroban transaction is simulated and assembled, producing a signed XDR ready for submission.

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Rust + `soroban-sdk`, compiled to WASM |
| Contract CLI | `stellar` CLI |
| Chain SDK | `@stellar/stellar-sdk` |
| Wallet | `@stellar/freighter-api` (Freighter browser extension) |
| Frontend | React + TypeScript (Vite) |
| Styling | Tailwind CSS |
| Hosting | Cloudflare Pages via `wrangler` |
| Tests (contracts) | `soroban-sdk` test utils |
| Tests (frontend) | Vitest + React Testing Library |
| CI/CD | GitHub Actions |
| Explorer | stellar.expert (testnet) |

## Feedback Form
https://docs.google.com/forms/d/e/1FAIpQLSdlWq1o723XapPdiOq9h1viVGqY-x-c7yRv9ntwJrZpYq7sEg/viewform?usp=publish-editor

## Feedback Responses
https://docs.google.com/spreadsheets/d/1Rk1Y8P_xq9-qSYhwaq-YUSMxRH7gw3XF-LJf1OIm2EY/edit?usp=sharing

## Project Structure

```
barternet/
├── contracts/                  # Rust smart contracts (Soroban)
│   ├── loyalty_token/          # SEP-41 fungible token contract
│   ├── token_factory/          # Deploys loyalty_token instances
│   ├── barter_pool/            # Hub-and-spoke AMM with routed swaps
│   └── redemption_registry/    # Catalog + redemption logic
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level pages
│   │   ├── lib/                # Stellar RPC helpers, contract wrappers, wallet service
│   │   ├── context/            # React context (wallet, etc.)
│   │   └── test/               # Frontend test setup
│   └── package.json
├── contracts.json              # Deployed contract addresses per network
├── DEPLOYMENTS.md              # Record of deployed contracts + tx hashes
└── PRD.md                      # Product requirements document
```

## Deployed Contract Addresses (Testnet)

| Contract | Address | Explorer |
|---|---|---|
| token_factory | `CCKP22DFS7IBH3XR2KHFOUJJGCKLL4BHQR2M5DV7RFJUTZ7FMTKFKQ7V` | [Lab](https://lab.stellar.org/r/testnet/contract/CCKP22DFS7IBH3XR2KHFOUJJGCKLL4BHQR2M5DV7RFJUTZ7FMTKFKQ7V) |
| barter_pool | `CBZXL3U4TMXMKO5HVQJJ76GK6LKSPIQLMSHT33CGYQOOC4TJEZKBIGAS` | [Lab](https://lab.stellar.org/r/testnet/contract/CBZXL3U4TMXMKO5HVQJJ76GK6LKSPIQLMSHT33CGYQOOC4TJEZKBIGAS) |
| redemption_registry | `CCDZ76SKGKV4VTHSJ7ZW4725KKPIFN3Y5TMELKFOQQSPCJ7FGE2HFGJD` | [Lab](https://lab.stellar.org/r/testnet/contract/CCDZ76SKGKV4VTHSJ7ZW4725KKPIFN3Y5TMELKFOQQSPCJ7FGE2HFGJD) |

Admin: `GAWDC6WWRG4M57V2SOFHJE3T56ZSQVD3Z4O32WMRPK6BK5E6WWRG5DR5`

## Quick Start

### Prerequisites

- **Rust** (stable, for contract compilation) — [rustup.rs](https://rustup.rs)
- **Node.js** 18+ and npm
- **Stellar CLI** — `cargo install stellar-cli --features opt`
- **Freighter wallet** browser extension (for frontend interaction)
- **wasm32 target** — `rustup target add wasm32-unknown-unknown`

### Build & Test Contracts

```bash
cd contracts

# Lint
cargo clippy --all-targets -- -D warnings

# Run tests (5+ test cases across all contract crates)
cargo test

# Build WASM binaries
cargo build --release --target wasm32-unknown-unknown
```

### Deploy Contracts to Testnet

```bash
# Deploy each contract (replace <admin-identity> with your Stellar identity name)
stellar contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/token_factory.wasm \
  --network testnet --source <admin-identity>

stellar contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/barter_pool.wasm \
  --network testnet --source <admin-identity>

stellar contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/redemption_registry.wasm \
  --network testnet --source <admin-identity>
```

Record the resulting contract addresses in `contracts.json` and `DEPLOYMENTS.md`.

### Run the Frontend

```bash
cd frontend
npm install

# Start dev server
npm run dev

# Run tests
npm run test:run

# Build for production
npm run build
```

## Key Files

| File | Purpose |
|---|---|
| [`contracts.json`](./contracts.json) | Deployed contract addresses (consumed by frontend and scripts) |
| [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) | Record of contract deployments and sample transaction hashes |
| [`PRD.md`](./PRD.md) | Full product requirements document |
| [`frontend/src/lib/wallet.ts`](./frontend/src/lib/wallet.ts) | Freighter wallet service wrapper |
| [`frontend/src/context/WalletContext.tsx`](./frontend/src/context/WalletContext.tsx) | Wallet React context |
| [`frontend/src/components/WalletButton.tsx`](./frontend/src/components/WalletButton.tsx) | Connect wallet UI button |
| [`frontend/src/test/wallet.test.ts`](./frontend/src/test/wallet.test.ts) | Wallet service unit tests |

## CI/CD

GitHub Actions pipeline (`.github/workflows/`):
- Contracts: lint → test → build
- Frontend: lint → test → build
- Deploy: manual trigger for contract deployment; automatic Cloudflare Pages deploy on main
