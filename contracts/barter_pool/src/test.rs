use crate::{BarterPool, BarterPoolClient};
use soroban_sdk::{
    testutils::{Address as _},
    Address, Env, String,
};

fn setup_token<'a>(env: &'a Env, admin: &Address, name: &str, symbol: &str) -> (Address, loyalty_token::LoyaltyTokenClient<'a>) {
    let contract_id = env.register(loyalty_token::LoyaltyToken, ());
    let client = loyalty_token::LoyaltyTokenClient::new(env, &contract_id);
    client.initialize(
        admin,
        &7u32,
        &String::from_str(env, name),
        &String::from_str(env, symbol),
    );
    (contract_id, client)
}

#[test]
fn test_swap_exact_in_works() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "TokenA", "TKA");
    let (hub_id, hub_client) = setup_token(&env, &admin, "Hub", "HUB");

    let pool_id = env.register(BarterPool, ());
    let pool_client = BarterPoolClient::new(&env, &pool_id);
    pool_client.initialize(&admin, &hub_id);

    loyalty_client.mint(&user, &1_000_000i128);
    hub_client.mint(&user, &1_000_000i128);

    pool_client.add_liquidity(&user, &loyalty_id, &100_000i128, &100_000i128);

    let reserves = pool_client.get_reserves_fn(&loyalty_id);
    assert_eq!(reserves.0, 100_000i128);
    assert_eq!(reserves.1, 100_000i128);

    let amount_out = pool_client.swap_exact_in(
        &user,
        &hub_id,
        &loyalty_id,
        &1000i128,
        &900i128,
    );
    assert!(amount_out > 0i128);
    assert!(amount_out < 1000i128);
}

#[test]
#[should_panic(expected = "slippage exceeded")]
fn test_swap_exact_in_respects_min_amount_out() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "TokenA", "TKA");
    let (hub_id, hub_client) = setup_token(&env, &admin, "Hub", "HUB");

    let pool_id = env.register(BarterPool, ());
    let pool_client = BarterPoolClient::new(&env, &pool_id);
    pool_client.initialize(&admin, &hub_id);

    loyalty_client.mint(&user, &1_000_000i128);
    hub_client.mint(&user, &1_000_000i128);

    pool_client.add_liquidity(&user, &loyalty_id, &100_000i128, &100_000i128);

    pool_client.swap_exact_in(
        &user,
        &hub_id,
        &loyalty_id,
        &1000i128,
        &5_000i128,
    );
}

#[test]
fn test_liquidity_addition_initial() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "LQT", "LQT");
    let (hub_id, hub_client) = setup_token(&env, &admin, "HUB", "HUB");

    let pool_id = env.register(BarterPool, ());
    let pool_client = BarterPoolClient::new(&env, &pool_id);
    pool_client.initialize(&admin, &hub_id);

    loyalty_client.mint(&user, &1_000_000i128);
    hub_client.mint(&user, &1_000_000i128);

    pool_client.add_liquidity(&user, &loyalty_id, &50_000i128, &50_000i128);

    let reserves = pool_client.get_reserves_fn(&loyalty_id);
    assert_eq!(reserves.0, 50_000i128);
    assert_eq!(reserves.1, 50_000i128);
}

#[test]
fn test_initialize_pool() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let hub_id = Address::generate(&env);

    let pool_id = env.register(BarterPool, ());
    let pool_client = BarterPoolClient::new(&env, &pool_id);
    pool_client.initialize(&admin, &hub_id);

    let reserves_empty = pool_client.get_reserves_fn(&hub_id);
    assert_eq!(reserves_empty.0, 0i128);
    assert_eq!(reserves_empty.1, 0i128);
}
