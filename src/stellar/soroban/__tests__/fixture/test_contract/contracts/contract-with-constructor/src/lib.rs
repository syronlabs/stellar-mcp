#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Duration, Env,
    Map, String, Symbol, Timepoint, Val, Vec, I256, U256,
};

#[derive(Clone)]
#[contracttype]
#[repr(u8)]
pub enum DataKey {
    Admin,
    Counter,
    Data,
    Account(Address),
    Contract((Address, u64)),
}

#[derive(Eq, PartialEq, Debug, Clone)]
#[contracterror]
#[repr(u8)]
pub enum ContractError {
    AdminNotFound = 1,
    InvalidValue = 2,
    OptionNotFound = 3,
}

#[derive(Clone)]
#[contracttype]
pub struct Data {
    pub admin: Address,
    pub counter: u32,
    pub message: String,
}

#[derive(Clone)]
#[contracttype]
pub struct DeepData2 {
    pub admin: Address,
    pub data: Data,
    pub complex: ComplexData,
}

#[derive(Clone)]
#[contracttype]
pub struct ComplexData {
    pub admin: Address,
    pub data: Data,
    pub bytes: Bytes,
    pub bytes_n: BytesN<32>,
    pub duration: Duration,
    pub timepoint: Timepoint,
    pub map: Map<String, u32>,
    pub vec: Vec<u32>,
    pub symbol: Symbol,
}

#[derive(Clone)]
#[contracttype]
pub struct OptionalData {
    pub maybe_u32: Option<u32>,
    pub maybe_address: Option<Address>,
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

    pub fn handle_integers(
        env: Env,
        i32_val: i32,
        i64_val: i64,
        i128_val: i128,
        i256_val: I256,
        u32_val: u32,
        u64_val: u64,
        u128_val: u128,
        u256_val: U256,
    ) -> (i32, u32) {
        (i32_val, u32_val)
    }

    pub fn handle_strings(
        env: Env,
        str_val: String,
        bytes_val: Bytes,
        bytes_n_val: BytesN<32>,
    ) -> String {
        str_val
    }

    pub fn handle_time(
        env: Env,
        duration: Duration,
        timepoint: Timepoint,
    ) -> (Duration, Timepoint) {
        (duration, timepoint)
    }

    pub fn handle_collections(
        env: Env,
        map: Map<String, u32>,
        vec: Vec<u32>,
    ) -> (Map<String, u32>, Vec<u32>) {
        (map, vec)
    }

    pub fn handle_custom_types(
        env: Env,
        data: Data,
        complex_data: ComplexData,
    ) -> (Data, ComplexData) {
        (data, complex_data)
    }

    pub fn handle_optionals(
        env: Env,
        maybe_u32: Option<u32>,
        maybe_address: Option<Address>,
    ) -> OptionalData {
        OptionalData {
            maybe_u32,
            maybe_address,
        }
    }

    pub fn handle_mixed(
        env: Env,
        address: Address,
        symbol: Symbol,
        val: Val,
        data: Data,
        maybe_u32: Option<u32>,
    ) -> (Address, Symbol, Val, Data, Option<u32>) {
        (address, symbol, val, data, maybe_u32)
    }

    pub fn set_data(env: Env, data: Data) {
        let admin_key = DataKey::Admin;
        let storage_admin = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&admin_key)
            .unwrap();
        storage_admin.require_auth();

        let data_key = DataKey::Data;
        env.storage().persistent().set(&data_key, &data);
    }

    pub fn get_data(env: Env) -> Result<Data, ContractError> {
        let data_key = DataKey::Data;
        let data: Option<Data> = env.storage().persistent().get(&data_key).unwrap();

        if data.is_none() {
            return Err(ContractError::OptionNotFound);
        }

        Ok(data.unwrap())
    }

    pub fn handle_errors(env: Env, should_error: bool) -> Result<u32, ContractError> {
        if should_error {
            Err(ContractError::InvalidValue)
        } else {
            Ok(42)
        }
    }
}

mod test;
