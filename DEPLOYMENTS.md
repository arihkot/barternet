# BarterNet Deployments

## Testnet Deployment

| Contract | Address | Deploy Tx | Lab |
|---|---|---|---|
| token_factory | `CCKP22DFS7IBH3XR2KHFOUJJGCKLL4BHQR2M5DV7RFJUTZ7FMTKFKQ7V` | [25d63216](https://stellar.expert/explorer/testnet/tx/25d632161400879b69780970576b66bdc7273403c9c9d87b0d84eabe9e62bcd4) | [Lab](https://lab.stellar.org/r/testnet/contract/CCKP22DFS7IBH3XR2KHFOUJJGCKLL4BHQR2M5DV7RFJUTZ7FMTKFKQ7V) |
| barter_pool | `CBZXL3U4TMXMKO5HVQJJ76GK6LKSPIQLMSHT33CGYQOOC4TJEZKBIGAS` | [87c8bb60](https://stellar.expert/explorer/testnet/tx/87c8bb60bd9cd44592e44acbdfaf6bfd204a09518d1e7611cb5aab866a73a7a2) | [Lab](https://lab.stellar.org/r/testnet/contract/CBZXL3U4TMXMKO5HVQJJ76GK6LKSPIQLMSHT33CGYQOOC4TJEZKBIGAS) |
| redemption_registry | `CCDZ76SKGKV4VTHSJ7ZW4725KKPIFN3Y5TMELKFOQQSPCJ7FGE2HFGJD` | [4ffef500](https://stellar.expert/explorer/testnet/tx/4ffef50042ccbc07138bd04b555a6c529ffb6f993319ce5e920993de4bde8b91) | [Lab](https://lab.stellar.org/r/testnet/contract/CCDZ76SKGKV4VTHSJ7ZW4725KKPIFN3Y5TMELKFOQQSPCJ7FGE2HFGJD) |

### Init Transactions

| Contract | Action | Tx Hash |
|---|---|---|
| token_factory | `initialize(admin)` | [cdb0ac4c](https://stellar.expert/explorer/testnet/tx/cdb0ac4c890e0e1b4352f43d5bf1f2a90ba064be1905b7546dcc5309810c1267) |
| token_factory | `set_wasm_hash` | [29141222](https://stellar.expert/explorer/testnet/tx/29141222e33cb24de79cd473f1487bb373fd9c02dace40e35fccbd54533bb194) |
| loyalty_token | `install` (WASM upload) | [656cd024](https://stellar.expert/explorer/testnet/tx/656cd0242dab9cd251a47bdbcc6fd57acd15c9644eddcbe102a113822679fc75) |
| barter_pool | `initialize(admin, native_sac)` | [e40d1470](https://stellar.expert/explorer/testnet/tx/e40d14708f5ca06b02db8f44a3e12e430003cd6d595289341601b19da6ae70c4) |
| redemption_registry | `initialize(admin)` | [56cef89d](https://stellar.expert/explorer/testnet/tx/56cef89d9555ba9286f6416034e3e4ccce73ab55af09249f67eae26ac89b3b31) |

### Loyalty Token WASM Hash

`718e2c456adfdba21b65536f75950f1ce8a675d4895a92238a1b0fdb3028451e`

### Admin Address

`GAWDC6WWRG4M57V2SOFHJE3T56ZSQVD3Z4O32WMRPK6BK5E6WWRG5DR5`

### Native SAC (XLM on Testnet)

`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

## Deploy Instructions

```bash
# Build contracts
cd contracts
cargo build --release --target wasm32-unknown-unknown
rustup target add wasm32-unknown-unknown

# Deploy token_factory
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/token_factory.wasm \
  --network testnet --source admin

# Install loyalty_token WASM
stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/loyalty_token.wasm \
  --network testnet --source admin

# Deploy barter_pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/barter_pool.wasm \
  --network testnet --source admin

# Deploy redemption_registry
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/redemption_registry.wasm \
  --network testnet --source admin

# Initialize contracts
ADMIN=$(stellar keys address admin)

stellar contract invoke --id <FACTORY_ID> --network testnet --source admin \
  -- initialize --admin "$ADMIN"

stellar contract invoke --id <FACTORY_ID> --network testnet --source admin \
  -- set_wasm_hash --wasm_hash <LOYALTY_WASM_HASH>

stellar contract invoke --id <POOL_ID> --network testnet --source admin \
  -- initialize --admin "$ADMIN" --native_sac CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

stellar contract invoke --id <REDEMPTION_ID> --network testnet --source admin \
  -- initialize --admin "$ADMIN"
```
