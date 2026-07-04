use crate::{LoyaltyToken, LoyaltyTokenClient};
use soroban_sdk::{
    testutils::{Address as _},
    Address, Env, String,
};

fn setup_token(env: &Env) -> (Address, LoyaltyTokenClient<'_>) {
    let admin = Address::generate(env);
    let contract_id = env.register(LoyaltyToken, ());
    let client = LoyaltyTokenClient::new(env, &contract_id);
    client.initialize(
        &admin,
        &7u32,
        &String::from_str(env, "TestToken"),
        &String::from_str(env, "TST"),
    );
    (admin, client)
}

#[test]
fn test_mint_by_admin_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);
    let to = Address::generate(&env);

    client.mint(&to, &1000i128);

    assert_eq!(client.balance(&to), 1000i128);
    assert_eq!(client.total_supply(), 1000i128);
}

#[test]
fn test_transfer_updates_balances_correctly() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &1000i128);

    client.transfer(&alice, &bob, &300i128);

    assert_eq!(client.balance(&alice), 700i128);
    assert_eq!(client.balance(&bob), 300i128);
    assert_eq!(client.total_supply(), 1000i128);
}

#[test]
fn test_burn_reduces_supply() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = setup_token(&env);

    client.mint(&admin, &2000i128);
    assert_eq!(client.total_supply(), 2000i128);

    client.burn(&admin, &500i128);

    assert_eq!(client.balance(&admin), 1500i128);
    assert_eq!(client.total_supply(), 1500i128);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_cannot_transfer_more_than_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100i128);

    client.transfer(&alice, &bob, &200i128);
}

#[test]
fn test_mint_multiple_recipients() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &500i128);
    client.mint(&bob, &300i128);

    assert_eq!(client.balance(&alice), 500i128);
    assert_eq!(client.balance(&bob), 300i128);
    assert_eq!(client.total_supply(), 800i128);
}

#[test]
fn test_token_metadata() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);

    assert_eq!(client.name(), String::from_str(&env, "TestToken"));
    assert_eq!(client.symbol(), String::from_str(&env, "TST"));
    assert_eq!(client.decimals(), 7u32);
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = setup_token(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.mint(&admin, &1000i128);

    let expiration = env.ledger().sequence() + 100;
    client.approve(&admin, &spender, &400i128, &expiration);

    assert_eq!(client.allowance(&admin, &spender), 400i128);

    client.transfer_from(&spender, &admin, &recipient, &200i128);

    assert_eq!(client.balance(&recipient), 200i128);
    assert_eq!(client.balance(&admin), 800i128);
    assert_eq!(client.allowance(&admin, &spender), 200i128);
}

#[test]
fn test_initial_total_supply_is_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);

    assert_eq!(client.total_supply(), 0i128);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_mint_zero_amount_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_token(&env);
    let to = Address::generate(&env);

    client.mint(&to, &0i128);
}

#[test]
fn test_admin_address_stored() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, client) = setup_token(&env);

    assert_eq!(client.admin(), admin);
}
