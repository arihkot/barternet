use crate::{TokenFactory, TokenFactoryClient};
use soroban_sdk::{
    testutils::{Address as _},
    Address, Env, String,
};

const LOYALTY_TOKEN_WASM: &[u8] =
    include_bytes!("../../target/wasm32-unknown-unknown/release/loyalty_token.wasm");

fn setup_factory(env: &Env) -> (Address, TokenFactoryClient<'_>) {
    let admin = Address::generate(env);
    let contract_id = env.register(TokenFactory, ());
    let client = TokenFactoryClient::new(env, &contract_id);
    client.initialize(&admin);
    (admin, client)
}

#[test]
fn test_initialize_sets_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(TokenFactory, ());
    let client = TokenFactoryClient::new(&env, &contract_id);

    client.initialize(&admin);

    let merchants = client.list_merchants();
    assert_eq!(merchants.len(), 0);
}

#[test]
fn test_initial_merchants_list_is_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_factory(&env);

    let merchants = client.list_merchants();
    assert_eq!(merchants.len(), 0);
}

#[test]
fn test_get_merchant_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_factory(&env);
    let unknown = Address::generate(&env);

    let result = client.get_merchant_fn(&unknown);
    assert!(result.is_none());
}

#[test]
#[should_panic(expected = "wasm hash not set - call set_wasm_hash first")]
fn test_register_merchant_without_wasm_hash_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_factory(&env);
    let merchant = Address::generate(&env);

    client.register_merchant(
        &merchant,
        &String::from_str(&env, "BadCoin"),
        &String::from_str(&env, "BAD"),
    );
}

#[test]
fn test_set_wasm_hash_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_factory(&env);

    let hash = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);
    client.set_wasm_hash(&hash);
}

#[test]
fn test_factory_registers_unique_merchant() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);

    let factory_contract_id = env.register(TokenFactory, ());
    let factory_client = TokenFactoryClient::new(&env, &factory_contract_id);
    factory_client.initialize(&admin);

    let wasm_hash = env
        .deployer()
        .upload_contract_wasm(LOYALTY_TOKEN_WASM);

    factory_client.set_wasm_hash(&wasm_hash);

    let token_address = factory_client.register_merchant(
        &merchant,
        &String::from_str(&env, "LoyaltyCoin"),
        &String::from_str(&env, "LYC"),
    );

    assert_ne!(token_address, factory_contract_id);

    let info = factory_client.get_merchant_fn(&merchant);
    assert!(info.is_some());
    let info = info.unwrap();
    assert_eq!(info.merchant, merchant);
    assert_eq!(info.token_address, token_address);

    let merchants = factory_client.list_merchants();
    assert_eq!(merchants.len(), 1);
}
