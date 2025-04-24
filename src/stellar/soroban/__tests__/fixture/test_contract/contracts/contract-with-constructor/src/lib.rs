#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
#[repr(u8)]
pub enum DataKey {
    Admin,
}

#[derive(Eq, PartialEq, Debug, Clone)]
#[contracterror]
#[repr(u8)]
pub enum ContractError {
    AdminNotFound = 1,
}

#[derive(Clone)]
#[contracttype]
pub struct Data {
    pub admin: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct DeepData2 {
    pub admin: Address,
    pub data: Data,
}

#[contract]
pub struct ContractWithConstructor;

#[contractimpl]
impl ContractWithConstructor {
    pub fn __constructor(env: Env, admin: Address) {
        let admin_key = DataKey::Admin;
        env.storage().persistent().set(&admin_key, &admin);
    }

    pub fn set_admin(env: Env, admin: Address) {
        let storage_admin = Self::get_admin(env.clone());
        storage_admin.require_auth();

        let admin_key = DataKey::Admin;
        env.storage().persistent().set(&admin_key, &admin);
    }

    pub fn get_admin(env: Env) -> Address {
        let admin_key = DataKey::Admin;
        env.storage().persistent().get(&admin_key).unwrap()
    }

    pub fn get_admin_from_storage(env: Env) -> Result<Address, ContractError> {
        let admin_key = DataKey::Admin;

        let admin: Option<Address> = env.storage().persistent().get(&admin_key).unwrap();

        if admin.is_none() {
            return Err(ContractError::AdminNotFound);
        }

        Ok(admin.unwrap())
    }

    #[allow(unused_variables)]
    pub fn method_with_args(env: Env, arg1: u32, arg2: u32) -> (u32, u32) {
        (arg1, arg2)
    }

    #[allow(unused_variables)]
    pub fn struct_as_arg(env: Env, arg: Data) -> Data {
        arg
    }

    #[allow(unused_variables)]
    pub fn struct_as_arg_deep(env: Env, arg: DeepData2) -> DeepData2 {
        arg
    }
}

mod test;
