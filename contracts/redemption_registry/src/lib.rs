#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, Symbol, Vec};

#[cfg(test)]
mod test;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Catalog(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct CatalogItem {
    pub item_id: u32,
    pub price: i128,
    pub stock: u32,
}

fn is_initialized(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Admin)
}

fn get_admin(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::Admin)
        .unwrap()
}

fn read_catalog(env: &Env, merchant: &Address) -> Vec<CatalogItem> {
    let key = DataKey::Catalog(merchant.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env))
}

fn write_catalog(env: &Env, merchant: &Address, catalog: &Vec<CatalogItem>) {
    let key = DataKey::Catalog(merchant.clone());
    env.storage().persistent().set(&key, catalog);
}

fn find_item(catalog: &Vec<CatalogItem>, item_id: u32) -> Option<(usize, CatalogItem)> {
    for (i, item) in catalog.iter().enumerate() {
        if item.item_id == item_id {
            return Some((i, item));
        }
    }
    None
}

#[contract]
pub struct RedemptionRegistry;

#[contractimpl]
impl RedemptionRegistry {
    pub fn initialize(env: Env, admin: Address) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    pub fn add_item(
        env: Env,
        merchant: Address,
        item_id: u32,
        price: i128,
        stock: u32,
    ) {
        merchant.require_auth();

        if price <= 0 {
            panic!("price must be positive");
        }

        let mut catalog = read_catalog(&env, &merchant);
        match find_item(&catalog, item_id) {
            Some((idx, _)) => {
                catalog.set(
                    idx as u32,
                    CatalogItem {
                        item_id,
                        price,
                        stock,
                    },
                );
            }
            None => {
                catalog.push_back(CatalogItem {
                    item_id,
                    price,
                    stock,
                });
            }
        }
        write_catalog(&env, &merchant, &catalog);

        env.events().publish(
            (Symbol::new(&env, "item_added"),),
            (merchant, item_id, price, stock),
        );
    }

    pub fn update_item_stock(
        env: Env,
        merchant: Address,
        item_id: u32,
        new_stock: u32,
    ) {
        merchant.require_auth();

        let mut catalog = read_catalog(&env, &merchant);
        match find_item(&catalog, item_id) {
            Some((idx, mut item)) => {
                item.stock = new_stock;
                catalog.set(idx as u32, item);
                write_catalog(&env, &merchant, &catalog);

                env.events().publish(
                    (Symbol::new(&env, "stock_updated"),),
                    (merchant, item_id, new_stock),
                );
            }
            None => {
                panic!("item not found");
            }
        }
    }

    pub fn redeem(
        env: Env,
        consumer: Address,
        merchant: Address,
        item_id: u32,
        token_address: Address,
    ) {
        consumer.require_auth();

        let mut catalog = read_catalog(&env, &merchant);
        let item = match find_item(&catalog, item_id) {
            Some((_, item)) => item,
            None => panic!("item not found"),
        };

        if item.stock == 0 {
            panic!("item out of stock");
        }

        let price = item.price;

        let transfer_args = soroban_sdk::vec![
            &env,
            consumer.into_val(&env),
            merchant.into_val(&env),
            price.into_val(&env),
        ];
        let _: () = env.invoke_contract(
            &token_address,
            &symbol_short!("transfer"),
            transfer_args,
        );

        let (idx, _) = find_item(&catalog, item_id).unwrap();
        let updated_item = CatalogItem {
            item_id,
            price,
            stock: item.stock.checked_sub(1).unwrap(),
        };
        catalog.set(idx as u32, updated_item);
        write_catalog(&env, &merchant, &catalog);

        env.events().publish(
            (Symbol::new(&env, "redemption"),),
            (consumer, merchant, item_id, price),
        );
    }

    pub fn get_catalog_fn(env: Env, merchant: Address) -> Vec<CatalogItem> {
        read_catalog(&env, &merchant)
    }

    pub fn get_item(env: Env, merchant: Address, item_id: u32) -> Option<CatalogItem> {
        let catalog = read_catalog(&env, &merchant);
        find_item(&catalog, item_id).map(|(_, item)| item)
    }
}
