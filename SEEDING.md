# Testnet Seeding

55 testnet accounts (5 merchant, 50 consumer) were scripted to exercise the full
mint > swap > redeem flow for demo and load-testing purposes.

See `scripts/seed.ts` for the generation script.

## Usage

```bash
cd scripts
npm install
npx tsx seed.ts
```

## Account Distribution

| Role | Count | Purpose |
|---|---|---|
| Merchants | 5 | Register tokens, populate catalogs, add liquidity |
| Consumers | 50 | Earn tokens, swap between merchants, redeem items |

All accounts are funded via Friendbot. This is testnet-only data for demonstration purposes.
