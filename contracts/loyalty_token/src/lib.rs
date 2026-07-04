#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

#[cfg(test)]
mod test;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Decimals,
    Name,
    Symbol,
    TotalSupply,
    Balance(Address),
    Allowance(AllowanceKey),
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

fn get_balance(env: &Env, addr: &Address) -> i128 {
    let key = DataKey::Balance(addr.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(0)
}

fn set_balance(env: &Env, addr: &Address, balance: i128) {
    let key = DataKey::Balance(addr.clone());
    env.storage().persistent().set(&key, &balance);
}

fn get_allowance(env: &Env, from: &Address, spender: &Address) -> AllowanceValue {
    let key = DataKey::Allowance(AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    });
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(AllowanceValue {
            amount: 0,
            expiration_ledger: 0,
        })
}

fn set_allowance(env: &Env, from: &Address, spender: &Address, value: &AllowanceValue) {
    let key = DataKey::Allowance(AllowanceKey {
        from: from.clone(),
        spender: spender.clone(),
    });
    env.storage().persistent().set(&key, value);
}

fn read_total_supply(env: &Env) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0)
}

fn write_total_supply(env: &Env, supply: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::TotalSupply, &supply);
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

#[contract]
pub struct LoyaltyToken;

#[contractimpl]
impl LoyaltyToken {
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Decimals, &decimal);
        env.storage().persistent().set(&DataKey::Name, &name);
        env.storage().persistent().set(&DataKey::Symbol, &symbol);

        env.events().publish(
            (Symbol::new(&env, "initialize"),),
            (admin, name, symbol),
        );
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = get_admin(&env);
        admin.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let to_balance = get_balance(&env, &to);
        set_balance(&env, &to, to_balance.checked_add(amount).unwrap());

        let total_supply = read_total_supply(&env);
        write_total_supply(&env, total_supply.checked_add(amount).unwrap());

        env.events()
            .publish((symbol_short!("mint"),), (admin, to, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        let admin = get_admin(&env);
        if from == admin {
            admin.require_auth();
        } else {
            from.require_auth();
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let from_balance = get_balance(&env, &from);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        set_balance(&env, &from, from_balance.checked_sub(amount).unwrap());

        let total_supply = read_total_supply(&env);
        write_total_supply(&env, total_supply.checked_sub(amount).unwrap());

        env.events()
            .publish((symbol_short!("burn"),), (from, amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let from_balance = get_balance(&env, &from);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        set_balance(&env, &from, from_balance.checked_sub(amount).unwrap());

        let to_balance = get_balance(&env, &to);
        set_balance(&env, &to, to_balance.checked_add(amount).unwrap());

        env.events().publish(
            (symbol_short!("transfer"),),
            (from, to, amount),
        );
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        get_balance(&env, &id)
    }

    pub fn total_supply(env: Env) -> i128 {
        read_total_supply(&env)
    }

    pub fn name(env: Env) -> String {
        env.storage().persistent().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().persistent().get(&DataKey::Symbol).unwrap()
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Decimals)
            .unwrap()
    }

    pub fn admin(env: Env) -> Address {
        get_admin(&env)
    }

    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: u32,
    ) {
        from.require_auth();

        let current_ledger = env.ledger().sequence();
        if expiration_ledger <= current_ledger {
            panic!("expiration_ledger must be in the future");
        }

        let allowance_val = AllowanceValue {
            amount,
            expiration_ledger,
        };
        set_allowance(&env, &from, &spender, &allowance_val);

        env.events().publish(
            (symbol_short!("approve"),),
            (from, spender, amount, expiration_ledger),
        );
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowance_val = get_allowance(&env, &from, &spender);
        let current_ledger = env.ledger().sequence();
        if allowance_val.expiration_ledger != 0 && current_ledger >= allowance_val.expiration_ledger {
            return 0;
        }
        allowance_val.amount
    }

    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        spender.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let allowance_val = get_allowance(&env, &from, &spender);
        let current_ledger = env.ledger().sequence();
        if allowance_val.expiration_ledger != 0 && current_ledger >= allowance_val.expiration_ledger {
            panic!("allowance expired");
        }
        if allowance_val.amount < amount {
            panic!("insufficient allowance");
        }

        let from_balance = get_balance(&env, &from);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        set_balance(&env, &from, from_balance.checked_sub(amount).unwrap());

        let to_balance = get_balance(&env, &to);
        set_balance(&env, &to, to_balance.checked_add(amount).unwrap());

        let new_allowance = AllowanceValue {
            amount: allowance_val.amount.checked_sub(amount).unwrap(),
            expiration_ledger: allowance_val.expiration_ledger,
        };
        set_allowance(&env, &from, &spender, &new_allowance);

        env.events().publish(
            (symbol_short!("transfer"),),
            (from, to, amount),
        );
    }

    pub fn spendable_balance(env: Env, id: Address) -> i128 {
        get_balance(&env, &id)
    }

    pub fn authorized(_env: Env, _id: Address) -> bool {
        true
    }

    pub fn burn_from(
        env: Env,
        spender: Address,
        from: Address,
        amount: i128,
    ) {
        spender.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let allowance_val = get_allowance(&env, &from, &spender);
        let current_ledger = env.ledger().sequence();
        if allowance_val.expiration_ledger != 0 && current_ledger >= allowance_val.expiration_ledger {
            panic!("allowance expired");
        }
        if allowance_val.amount < amount {
            panic!("insufficient allowance");
        }

        let from_balance = get_balance(&env, &from);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        set_balance(&env, &from, from_balance.checked_sub(amount).unwrap());

        let total_supply = read_total_supply(&env);
        write_total_supply(&env, total_supply.checked_sub(amount).unwrap());

        let new_allowance = AllowanceValue {
            amount: allowance_val.amount.checked_sub(amount).unwrap(),
            expiration_ledger: allowance_val.expiration_ledger,
        };
        set_allowance(&env, &from, &spender, &new_allowance);

        env.events()
            .publish((symbol_short!("burn"),), (from, amount));
    }
}
