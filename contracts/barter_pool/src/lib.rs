#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, Symbol};

#[cfg(test)]
mod test;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Reserves(Address),
    NativeSac,
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

fn get_reserves(env: &Env, token: &Address) -> (i128, i128) {
    let key = DataKey::Reserves(token.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or((0, 0))
}

fn set_reserves(env: &Env, token: &Address, token_reserve: i128, hub_reserve: i128) {
    let key = DataKey::Reserves(token.clone());
    env.storage()
        .persistent()
        .set(&key, &(token_reserve, hub_reserve));
}

fn get_native_sac(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::NativeSac)
        .unwrap()
}

fn is_native(env: &Env, token: &Address) -> bool {
    let native_sac = get_native_sac(env);
    *token == native_sac
}

fn compute_swap_out(amount_in: i128, reserve_in: i128, reserve_out: i128) -> i128 {
    let amount_in_with_fee = amount_in.checked_mul(997).unwrap();
    let numerator = amount_in_with_fee.checked_mul(reserve_out).unwrap();
    let denominator = reserve_in
        .checked_mul(1000)
        .unwrap()
        .checked_add(amount_in_with_fee)
        .unwrap();
    numerator.checked_div(denominator).unwrap()
}

fn transfer_token(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) {
    let args = soroban_sdk::vec![
        env,
        from.clone().into_val(env),
        to.clone().into_val(env),
        amount.into_val(env),
    ];
    let _: () = env.invoke_contract(token, &symbol_short!("transfer"), args);
}

#[contract]
pub struct BarterPool;

#[contractimpl]
impl BarterPool {
    pub fn initialize(env: Env, admin: Address, native_sac: Address) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::NativeSac, &native_sac);

        env.events()
            .publish((Symbol::new(&env, "initialize"),), (admin, native_sac));
    }

    pub fn add_liquidity(
        env: Env,
        provider: Address,
        token: Address,
        token_amt: i128,
        hub_amt: i128,
    ) {
        provider.require_auth();

        if token_amt <= 0 || hub_amt <= 0 {
            panic!("amounts must be positive");
        }

        let pool_addr = env.current_contract_address();
        let (token_reserve, hub_reserve) = get_reserves(&env, &token);

        if token_reserve > 0 && hub_reserve > 0 {
            let required_hub = token_amt
                .checked_mul(hub_reserve)
                .unwrap()
                .checked_div(token_reserve)
                .unwrap();
            if hub_amt < required_hub {
                panic!("insufficient hub asset provided");
            }
        }

        transfer_token(&env, &token, &provider, &pool_addr, token_amt);

        let native_sac = get_native_sac(&env);
        let hub_args = soroban_sdk::vec![
            &env,
            provider.into_val(&env),
            pool_addr.into_val(&env),
            hub_amt.into_val(&env),
        ];
        let _: () =
            env.invoke_contract(&native_sac, &symbol_short!("transfer"), hub_args);

        let new_token_reserve = token_reserve.checked_add(token_amt).unwrap();
        let new_hub_reserve = hub_reserve.checked_add(hub_amt).unwrap();
        set_reserves(&env, &token, new_token_reserve, new_hub_reserve);

        env.events().publish(
            (Symbol::new(&env, "liquidity_added"),),
            (provider, token, token_amt, hub_amt),
        );
    }

    pub fn swap_exact_in(
        env: Env,
        trader: Address,
        token_in: Address,
        token_out: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        trader.require_auth();

        if amount_in <= 0 {
            panic!("amount_in must be positive");
        }

        let pool_addr = env.current_contract_address();
        let native_sac = get_native_sac(&env);

        if is_native(&env, &token_in) {
            let (token_out_reserve, hub_reserve) = get_reserves(&env, &token_out);
            if token_out_reserve == 0 || hub_reserve == 0 {
                panic!("no liquidity for this pair");
            }

            let amount_out = compute_swap_out(amount_in, hub_reserve, token_out_reserve);
            if amount_out < min_amount_out {
                panic!("slippage exceeded");
            }

            let recv_args = soroban_sdk::vec![
                &env,
                trader.into_val(&env),
                pool_addr.into_val(&env),
                amount_in.into_val(&env),
            ];
            let _: () =
                env.invoke_contract(&native_sac, &symbol_short!("transfer"), recv_args);

            transfer_token(&env, &token_out, &pool_addr, &trader, amount_out);

            let new_hub_reserve = hub_reserve.checked_add(amount_in).unwrap();
            let new_token_out_reserve = token_out_reserve.checked_sub(amount_out).unwrap();
            set_reserves(&env, &token_out, new_token_out_reserve, new_hub_reserve);

            env.events().publish(
                (symbol_short!("swap"),),
                (trader, token_in, amount_in, token_out, amount_out),
            );

            amount_out
        } else if is_native(&env, &token_out) {
            let (token_in_reserve, hub_reserve) = get_reserves(&env, &token_in);
            if token_in_reserve == 0 || hub_reserve == 0 {
                panic!("no liquidity for this pair");
            }

            let amount_out = compute_swap_out(amount_in, token_in_reserve, hub_reserve);
            if amount_out < min_amount_out {
                panic!("slippage exceeded");
            }

            transfer_token(&env, &token_in, &trader, &pool_addr, amount_in);

            let send_args = soroban_sdk::vec![
                &env,
                pool_addr.into_val(&env),
                trader.into_val(&env),
                amount_out.into_val(&env),
            ];
            let _: () =
                env.invoke_contract(&native_sac, &symbol_short!("transfer"), send_args);

            let new_token_in_reserve = token_in_reserve.checked_add(amount_in).unwrap();
            let new_hub_reserve = hub_reserve.checked_sub(amount_out).unwrap();
            set_reserves(&env, &token_in, new_token_in_reserve, new_hub_reserve);

            env.events().publish(
                (symbol_short!("swap"),),
                (trader, token_in, amount_in, token_out, amount_out),
            );

            amount_out
        } else {
            let (token_in_reserve, hub_reserve) = get_reserves(&env, &token_in);
            if token_in_reserve == 0 || hub_reserve == 0 {
                panic!("no liquidity for token_in pair");
            }

            let (token_out_reserve, hub_reserve_2) = get_reserves(&env, &token_out);
            if token_out_reserve == 0 || hub_reserve_2 == 0 {
                panic!("no liquidity for token_out pair");
            }

            let hub_amount = compute_swap_out(amount_in, token_in_reserve, hub_reserve);
            let amount_out = compute_swap_out(hub_amount, hub_reserve_2, token_out_reserve);
            if amount_out < min_amount_out {
                panic!("slippage exceeded");
            }

            transfer_token(&env, &token_in, &trader, &pool_addr, amount_in);
            transfer_token(&env, &token_out, &pool_addr, &trader, amount_out);

            let new_token_in_reserve = token_in_reserve.checked_add(amount_in).unwrap();
            let new_hub_reserve_1 = hub_reserve.checked_sub(hub_amount).unwrap();
            set_reserves(&env, &token_in, new_token_in_reserve, new_hub_reserve_1);

            let new_hub_reserve_2 = hub_reserve_2.checked_add(hub_amount).unwrap();
            let new_token_out_reserve = token_out_reserve.checked_sub(amount_out).unwrap();
            set_reserves(&env, &token_out, new_token_out_reserve, new_hub_reserve_2);

            env.events().publish(
                (symbol_short!("swap"),),
                (trader, token_in, amount_in, token_out, amount_out),
            );

            amount_out
        }
    }

    pub fn get_reserves_fn(env: Env, token: Address) -> (i128, i128) {
        get_reserves(&env, &token)
    }

    pub fn get_estimated_output(
        env: Env,
        token_in: Address,
        token_out: Address,
        amount_in: i128,
    ) -> i128 {
        if amount_in <= 0 {
            return 0;
        }

        if is_native(&env, &token_in) {
            let (token_out_reserve, hub_reserve) = get_reserves(&env, &token_out);
            if token_out_reserve == 0 || hub_reserve == 0 {
                return 0;
            }
            compute_swap_out(amount_in, hub_reserve, token_out_reserve)
        } else if is_native(&env, &token_out) {
            let (token_in_reserve, hub_reserve) = get_reserves(&env, &token_in);
            if token_in_reserve == 0 || hub_reserve == 0 {
                return 0;
            }
            compute_swap_out(amount_in, token_in_reserve, hub_reserve)
        } else {
            let (token_in_reserve, hub_reserve) = get_reserves(&env, &token_in);
            if token_in_reserve == 0 || hub_reserve == 0 {
                return 0;
            }
            let (token_out_reserve, hub_reserve_2) = get_reserves(&env, &token_out);
            if token_out_reserve == 0 || hub_reserve_2 == 0 {
                return 0;
            }
            let hub_amount = compute_swap_out(amount_in, token_in_reserve, hub_reserve);
            compute_swap_out(hub_amount, hub_reserve_2, token_out_reserve)
        }
    }
}
