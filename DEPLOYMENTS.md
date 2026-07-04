# BarterNet Deployments

## Testnet Deployment

| Contract | Address | Deploy Tx |
|---|---|---|
| token_factory | `TBD` | `TBD` |
| barter_pool | `TBD` | `TBD` |
| redemption_registry | `TBD` | `TBD` |

### Sample Interactions

| Action | Tx Hash | Explorer |
|---|---|---|
| register_merchant | `TBD` | [View](https://stellar.expert/explorer/testnet/tx/TBD) |
| mint | `TBD` | [View](https://stellar.expert/explorer/testnet/tx/TBD) |
| swap_exact_in | `TBD` | [View](https://stellar.expert/explorer/testnet/tx/TBD) |
| redeem | `TBD` | [View](https://stellar.expert/explorer/testnet/tx/TBD) |

## Deploy Instructions

```bash
# Build contracts
cd contracts
cargo build --release --target wasm32-unknown-unknown

# Add wasm target if needed
rustup target add wasm32-unknown-unknown

# Deploy token_factory
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/token_factory.wasm \
  --network testnet \
  --source <admin-identity>

# Deploy barter_pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/barter_pool.wasm \
  --network testnet \
  --source <admin-identity>

# Deploy redemption_registry
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/redemption_registry.wasm \
  --network testnet \
  --source <admin-identity>

# Update contracts.json with the deployed addresses:
# {
#   "networks": {
#     "testnet": {
#       "token_factory": "C...",
#       "barter_pool": "C...",
#       "redemption_registry": "C..."
#     }
#   }
# }
```
