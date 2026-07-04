use crate::{RedemptionRegistry, RedemptionRegistryClient};
use soroban_sdk::{
    testutils::{Address as _},
    Address, Env, String,
};

fn setup_registry(env: &Env) -> (Address, RedemptionRegistryClient<'_>) {
    let admin = Address::generate(env);
    let contract_id = env.register(RedemptionRegistry, ());
    let client = RedemptionRegistryClient::new(env, &contract_id);
    client.initialize(&admin);
    (admin, client)
}

fn add_item(client: &RedemptionRegistryClient, merchant: &Address, item_id: u32, price: i128, stock: u32) {
    client.add_item(merchant, &item_id, &price, &stock);
}

fn setup_token<'a>(env: &'a Env, admin: &Address, name: &str, symbol: &str) -> (Address, loyalty_token::LoyaltyTokenClient<'a>) {
    let contract_id = env.register(loyalty_token::LoyaltyToken, ());
    let client = loyalty_token::LoyaltyTokenClient::new(env, &contract_id);
    client.initialize(admin, &7u32, &String::from_str(env, name), &String::from_str(env, symbol));
    (contract_id, client)
}

#[test]
fn test_redeem_decrements_stock() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_reg_admin, registry_client) = setup_registry(&env);
    let merchant = Address::generate(&env);
    let consumer = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "RewardsToken", "RWRD");

    loyalty_client.mint(&consumer, &10_000i128);

    add_item(&registry_client, &merchant, 1, 500i128, 5);

    let item_before = registry_client.get_item(&merchant, &1);
    assert!(item_before.is_some());
    assert_eq!(item_before.unwrap().stock, 5);

    registry_client.redeem(&consumer, &merchant, &1, &loyalty_id);

    let item_after = registry_client.get_item(&merchant, &1);
    assert!(item_after.is_some());
    assert_eq!(item_after.unwrap().stock, 4);

    assert_eq!(loyalty_client.balance(&consumer), 9_500i128);
    assert_eq!(loyalty_client.balance(&merchant), 500i128);
}

#[test]
fn test_add_item_to_catalog() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_registry(&env);
    let merchant = Address::generate(&env);

    add_item(&client, &merchant, 1, 100i128, 10);

    let item = client.get_item(&merchant, &1);
    assert!(item.is_some());
    assert_eq!(item.unwrap().price, 100i128);
}

#[test]
fn test_update_stock() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_registry(&env);
    let merchant = Address::generate(&env);

    add_item(&client, &merchant, 1, 200i128, 20);

    client.update_item_stock(&merchant, &1, &50);

    let item = client.get_item(&merchant, &1);
    assert!(item.is_some());
    assert_eq!(item.unwrap().stock, 50);
}

#[test]
#[should_panic(expected = "item out of stock")]
fn test_redeem_out_of_stock_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_reg_admin, registry_client) = setup_registry(&env);
    let merchant = Address::generate(&env);
    let consumer = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "RWRD", "RWRD");

    loyalty_client.mint(&consumer, &10_000i128);

    add_item(&registry_client, &merchant, 1, 100i128, 0);

    registry_client.redeem(&consumer, &merchant, &1, &loyalty_id);
}

#[test]
#[should_panic(expected = "item not found")]
fn test_redeem_nonexistent_item_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_reg_admin, registry_client) = setup_registry(&env);
    let merchant = Address::generate(&env);
    let consumer = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "RWRD", "RWRD");

    loyalty_client.mint(&consumer, &10_000i128);

    registry_client.redeem(&consumer, &merchant, &99, &loyalty_id);
}

#[test]
fn test_get_catalog() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client) = setup_registry(&env);
    let merchant = Address::generate(&env);

    add_item(&client, &merchant, 1, 300i128, 3);
    add_item(&client, &merchant, 2, 500i128, 7);

    let catalog = client.get_catalog_fn(&merchant);
    assert_eq!(catalog.len(), 2);
}

#[test]
fn test_multiple_redeems() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_reg_admin, registry_client) = setup_registry(&env);
    let merchant = Address::generate(&env);
    let consumer = Address::generate(&env);

    let (loyalty_id, loyalty_client) = setup_token(&env, &admin, "RWRD", "RWRD");

    loyalty_client.mint(&consumer, &10_000i128);

    add_item(&registry_client, &merchant, 1, 100i128, 5);

    registry_client.redeem(&consumer, &merchant, &1, &loyalty_id);
    assert_eq!(registry_client.get_item(&merchant, &1).unwrap().stock, 4);
    assert_eq!(loyalty_client.balance(&consumer), 9_900i128);

    registry_client.redeem(&consumer, &merchant, &1, &loyalty_id);
    assert_eq!(registry_client.get_item(&merchant, &1).unwrap().stock, 3);
    assert_eq!(loyalty_client.balance(&consumer), 9_800i128);

    registry_client.redeem(&consumer, &merchant, &1, &loyalty_id);
    assert_eq!(registry_client.get_item(&merchant, &1).unwrap().stock, 2);
    assert_eq!(loyalty_client.balance(&consumer), 9_700i128);
}
