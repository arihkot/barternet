#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, String, Symbol, Vec};

#[cfg(test)]
mod test;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    WasmHash,
    MerchantInfos,
}

#[derive(Clone)]
#[contracttype]
pub struct MerchantInfo {
    pub merchant: Address,
    pub name: String,
    pub symbol: String,
    pub token_address: Address,
}

fn is_initialized(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Admin)
}

fn get_admin(env: &Env) -> Address {
    env.storage().persistent().get(&DataKey::Admin).unwrap()
}

fn get_merchants(env: &Env) -> Vec<MerchantInfo> {
    env.storage()
        .persistent()
        .get(&DataKey::MerchantInfos)
        .unwrap_or(Vec::new(env))
}

fn set_merchants(env: &Env, merchants: &Vec<MerchantInfo>) {
    env.storage()
        .persistent()
        .set(&DataKey::MerchantInfos, merchants);
}

#[contract]
pub struct TokenFactory;

#[contractimpl]
impl TokenFactory {
    pub fn initialize(env: Env, admin: Address) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Admin, &admin);

        let empty: Vec<MerchantInfo> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::MerchantInfos, &empty);

        env.events()
            .publish((Symbol::new(&env, "initialize"),), admin);
    }

    pub fn set_wasm_hash(env: Env, wasm_hash: soroban_sdk::BytesN<32>) {
        let admin = get_admin(&env);
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::WasmHash, &wasm_hash);
    }

    pub fn register_merchant(
        env: Env,
        merchant: Address,
        name: String,
        symbol: String,
    ) -> Address {
        let admin = get_admin(&env);
        admin.require_auth();

        let wasm_hash: soroban_sdk::BytesN<32> = env
            .storage()
            .persistent()
            .get(&DataKey::WasmHash)
            .unwrap_or_else(|| {
                panic!("wasm hash not set - call set_wasm_hash first");
            });

        let salt = env.prng().gen::<soroban_sdk::BytesN<32>>();
        #[allow(deprecated)]
        let token_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy(wasm_hash);

        let admin_val = admin.clone().into_val(&env);
        let decimals_val = 7u32.into_val(&env);
        let name_val = name.clone().into_val(&env);
        let symbol_val = symbol.clone().into_val(&env);

        let init_args = soroban_sdk::vec![
            &env,
            admin_val,
            decimals_val,
            name_val,
            symbol_val,
        ];

        let _: () = env.invoke_contract(
            &token_address,
            &Symbol::new(&env, "initialize"),
            init_args,
        );

        let mut merchants = get_merchants(&env);
        merchants.push_back(MerchantInfo {
            merchant: merchant.clone(),
            name: name.clone(),
            symbol: symbol.clone(),
            token_address: token_address.clone(),
        });
        set_merchants(&env, &merchants);

        env.events().publish(
            (Symbol::new(&env, "merchant_registered"),),
            (merchant, name, symbol, token_address.clone()),
        );

        token_address
    }

    pub fn get_merchant_fn(env: Env, merchant: Address) -> Option<MerchantInfo> {
        let merchants = get_merchants(&env);
        for info in merchants.iter() {
            if info.merchant == merchant {
                return Some(info);
            }
        }
        None
    }

    pub fn list_merchants(env: Env) -> Vec<MerchantInfo> {
        get_merchants(&env)
    }
}
