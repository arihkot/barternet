# BarterNet

**Cross-Merchant Loyalty Liquidity Engine**

BarterNet lets independent small merchants each mint their own loyalty token, while letting consumers spend those points **outside** the business that issued them. A customer earns "Coffee Points" at a cafe and can redeem a discount at the bookstore next door — because BarterNet routes the exchange through an on-chain hub-and-spoke AMM instead of bilateral partnership agreements.

## How It Works

1. **Issuance** — Merchants mint a branded fungible token (SEP-41) through a factory contract, with zero smart-contract code to write themselves.
2. **Liquidity** — Every merchant token is paired against a common hub asset (native XLM) in a constant-product AMM, so any token can be swapped into any other token in one atomic routed transaction.
3. **Redemption** — Merchants publish a redemption catalog (item → price in their own token); consumers redeem directly on-chain, and the contract enforces stock and transfers tokens atomically.

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
│   │   ├── lib/                # Stellar RPC helpers, contract wrappers
│   │   ├── context/            # React context (wallet, etc.)
│   │   └── test/               # Frontend test setup
│   └── package.json
├── contracts.json              # Deployed contract addresses per network
├── DEPLOYMENTS.md              # Record of deployed contracts + tx hashes
└── PRD.md                      # Product requirements document
```

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

## CI/CD

GitHub Actions pipeline (`.github/workflows/`):
- Contracts: lint → test → build
- Frontend: lint → test → build
- Deploy: manual trigger for contract deployment; automatic Cloudflare Pages deploy on main
