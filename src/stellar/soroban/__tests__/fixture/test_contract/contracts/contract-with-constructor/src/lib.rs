#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
#[repr(u8)]
pub enum DataKey {
    Admin,
}

#[contract]
pub struct ContractWithConstructor;

#[contractimpl]
impl ContractWithConstructor {
    pub fn __constructor(env: Env, admin: Address) {
        let admin_key = DataKey::Admin;
        env.storage().persistent().set(&admin_key, &admin);
    }

    pub fn get_admin(env: Env) -> Address {
        let admin_key = DataKey::Admin;
        env.storage().persistent().get(&admin_key).unwrap()
    }
}

mod test;
