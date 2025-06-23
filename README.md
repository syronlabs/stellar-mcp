[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/syronlabs-stellar-mcp-badge.png)](https://mseep.ai/app/syronlabs-stellar-mcp)

# 🌟 Stellar MCP

A Model Context Protocol server that provides Stellar blockchain interaction capabilities. This server enables LLMs to interact with both Stellar Classic and Soroban smart contracts, manage accounts, and perform various blockchain operations.

## 🧩 Components

### 🛠️ Tools

#### 💫 Stellar Classic Operations

- **stellar_create_account**

  - Create a new Stellar account

- **stellar_balance**

  - Get the balance of a Stellar account
  - Input: `account` (string): The public key of the account to check balance

- **stellar_payment**

  - Send a payment to another account
  - Inputs:
    - `destination` (string, required): The destination account public key
    - `amount` (string, required): The amount to send
    - `secretKey` (string, required): The secret key of the source account
    - `asset` (object, optional): Custom asset details
      - `code` (string): The asset code
      - `issuer` (string): The asset issuer public key

- **stellar_transactions**

  - Get transaction history for an account
  - Input: `account` (string): The account public key to get transactions for

- **stellar_create_asset**

  - Create a new asset on the Stellar network
  - Inputs:
    - `code` (string, required): The asset code
    - `issuerSecretKey` (string, required): The secret key of the issuing account
    - `distributorSecretKey` (string, required): The secret key of the distributing account
    - `totalSupply` (string, required): The total supply of the asset

- **stellar_change_trust**

  - Change trustline for an asset
  - Inputs:
    - `asset` (object, required):
      - `code` (string, required): The asset code
      - `issuer` (string, required): The asset issuer public key
    - `limit` (string, required): The trust limit
    - `secretKey` (string, required): The secret key of the account changing trust

- **stellar_create_claimable_balance**

  - Create a claimable balance that can be claimed by specified accounts under certain conditions
  - Inputs:
    - `asset` (object, optional): Custom asset details. If not provided, uses native XLM
      - `code` (string): The asset code (e.g., "USD", "EUR")
      - `issuer` (string): The asset issuer public key
    - `amount` (string, required): Amount to lock in the claimable balance
    - `claimants` (array, required): List of accounts that can claim this balance
      - `destination` (string): Public key of the account that can claim
      - `predicate` (object): Conditions for claiming
        - `type` (string): One of: "UNCONDITIONAL", "BEFORE_RELATIVE_TIME", "BEFORE_ABSOLUTE_TIME", "NOT", "AND", "OR"
        - `value` (number or array): For time predicates: seconds/timestamp, for compound predicates: array of predicates
    - `secretKey` (string, required): Secret key of the account creating the balance

- **stellar_claim_claimable_balance**

  - Claim a claimable balance using its ID
  - Inputs:
    - `balanceId` (string, required): ID of the claimable balance to claim (returned from createClaimableBalance)
    - `secretKey` (string, required): Secret key of the claiming account (must be one of the claimants)

- **stellar_fund_account**
  - Fund a test account using the Friendbot (testnet only)
  - Input: `publicKey` (string): The public key of the account to fund

#### 📝 Soroban Smart Contract Operations

- **soroban_build_and_optimize**

  - Build and optimize Soroban smart contracts
  - Inputs:
    - `contractPath` (string, optional): The path to the contract directory. Defaults to current working directory
  - Outputs:
    - Build logs and compilation status
    - List of optimized WASM files
    - Optimization results for each contract
  - Features:
    - Automatically builds contracts using `stellar contract build`
    - Finds all WASM files in the target directory
    - Optimizes each WASM file using `stellar contract optimize`
    - Provides detailed logs of the entire process

- **soroban_deploy**

  - Deploy Soroban smart contracts to the Stellar network
  - Inputs:
    - `wasmPath` (string, required): Path to the compiled WASM file
    - `secretKey` (string, required): Secret key of the deploying account
    - `constructorArgs` (array, optional): Arguments for contract constructor if applicable
      - Each argument should be an object with:
        - `name` (string): Name of the constructor parameter
        - `type` (string): Type of the argument (e.g., "Address", "String", etc.)
        - `value` (string): Value of the argument
  - Outputs:
    - Contract ID (starts with "C" followed by 55 characters)
    - Deployment status messages
    - Transaction details
  - Features:
    - Automatically detects if contract has a constructor
    - Validates constructor arguments before deployment
    - Throws error if constructor arguments are missing for contracts that require them
    - Provides detailed deployment logs and status updates
    - Supports both simple contracts and contracts with initialization logic
  - Example Usage:

    ```typescript
    // Deploying a contract without constructor
    await soroban.deploy({
      wasmPath: 'path/to/hello_world.wasm',
      secretKey: 'S...',
    });

    // Deploying a contract with constructor
    await soroban.deploy({
      wasmPath: 'path/to/contract_with_constructor.wasm',
      secretKey: 'S...',
      constructorArgs: [
        {
          name: 'admin',
          type: 'Address',
          value: 'G...',
        },
      ],
    });
    ```

- **soroban_retrieve_contract_methods**

  - Retrieve the complete interface of a deployed Soroban smart contract
  - Inputs:
    - `contractAddress` (string, required): Address of the deployed contract (starts with "C")
    - `secretKey` (string, required): Secret key of the account making the query
  - Outputs:
    - A structured ContractInterface object containing:
      - `name`: The name of the contract
      - `methods`: Array of contract methods, each containing:
        - `name`: Method name
        - `parameters`: Array of parameters with:
          - `name`: Parameter name
          - `type`: Parameter type, which can be:
            - Primitive types (u32, i32, u64, i64, u128, i128, bool)
            - Soroban types (Address, String, Bytes, BytesN, Duration, Timepoint)
            - Custom structs (Data, ComplexData, etc.)
            - Collections (Vec<T>, Map<K, V>)
            - Optional types (Option<T>)
            - Tuples ((T1, T2, ...))
            - Result types (Result<T, E>)
        - `returnType`: Return type of the method, which can be:
          - Void (())
          - Single type (T)
          - Tuple ((T1, T2, ...))
          - Result (Result<T, E>)
      - `structs`: Array of contract structs, each containing:
        - `name`: Struct name
        - `fields`: Array of fields with name, type, and visibility
      - `enums`: Array of contract enums, each containing:
        - `name`: Enum name
        - `variants`: Array of variants with:
          - `name`: Variant name
          - `value`: Optional numeric value (for C-style enums)
          - `dataType`: Optional data type for variants with associated data
        - `isError`: Boolean indicating if it's an error enum
  - Features:
    - Supports all Soroban data types (primitives, structs, nested structs, enums)
    - Provides complete contract interface including methods, structs, and enums
    - Handles complex data types and nested structures
    - Returns a structured JSON representation of the contract interface
    - Automatically filters out the `env` parameter from method signatures (provided by the Soroban blockchain)
    - Supports various enum types:
      - Simple enums (no associated data)
      - C-style enums (with numeric values)
      - Enums with single data type
      - Enums with tuple data types
      - Error enums (marked with #[contracterror])
  - Example Usage:

    ```typescript
    const result = await soroban.retrieveContractMethods({
      contractAddress:
        'CACLOQNDBVG2Q7VRQGOKC4THZ34FHW2PUYQQOAVBSLJEV6VHEF3ZCIPO',
    });

    // Example response:
    [
      {
        type: 'text',
        text: '🚀 Retrieving contract methods for address: CACLOQNDBVG2Q7VRQGOKC4THZ34FHW2PUYQQOAVBSLJEV6VHEF3ZCIPO',
      },
      {
        type: 'text',
        text: 'Interface retrieved successfully',
      },
      {
        type: 'text',
        text: 'Contract Interface',
      },
      {
        type: 'text',
        text: JSON.stringify(
          {
            name: 'Contract',
            methods: [
              {
                name: 'set_admin',
                parameters: [{ name: 'admin', type: 'Address' }],
                returnType: '()',
              },
              {
                name: 'get_admin',
                parameters: [],
                returnType: 'Address',
              },
              {
                name: 'method_with_args',
                parameters: [
                  { name: 'arg1', type: 'u32' },
                  { name: 'arg2', type: 'u32' },
                ],
                returnType: '(u32, u32)',
              },
              {
                name: 'handle_integers',
                parameters: [
                  { name: 'i32_val', type: 'i32' },
                  { name: 'i64_val', type: 'i64' },
                  { name: 'i128_val', type: 'i128' },
                  { name: 'i256_val', type: 'I256' },
                  { name: 'u32_val', type: 'u32' },
                  { name: 'u64_val', type: 'u64' },
                  { name: 'u128_val', type: 'u128' },
                  { name: 'u256_val', type: 'U256' },
                ],
                returnType: '(i32, u32)',
              },
              {
                name: 'handle_strings',
                parameters: [
                  { name: 'str_val', type: 'String' },
                  { name: 'bytes_val', type: 'Bytes' },
                  { name: 'bytes_n_val', type: 'BytesN<32>' },
                ],
                returnType: 'String',
              },
              {
                name: 'handle_collections',
                parameters: [
                  { name: 'map', type: 'Map<String, u32>' },
                  { name: 'vec', type: 'Vec<u32>' },
                ],
                returnType: '(Map<String, u32>, Vec<u32>)',
              },
              {
                name: 'handle_custom_types',
                parameters: [
                  { name: 'data', type: 'Data' },
                  { name: 'complex_data', type: 'ComplexData' },
                ],
                returnType: '(Data, ComplexData)',
              },
              {
                name: 'handle_optionals',
                parameters: [
                  { name: 'maybe_u32', type: 'Option<u32>' },
                  { name: 'maybe_address', type: 'Option<Address>' },
                ],
                returnType: 'OptionalData',
              },
              {
                name: 'get_admin_from_storage',
                parameters: [],
                returnType: 'Result<Address, ContractError>',
              },
            ],
            structs: [
              {
                name: 'Data',
                fields: [
                  { name: 'admin', type: 'Address', visibility: 'pub' },
                  { name: 'counter', type: 'u32', visibility: 'pub' },
                  { name: 'message', type: 'String', visibility: 'pub' },
                ],
              },
              {
                name: 'ComplexData',
                fields: [
                  { name: 'admin', type: 'Address', visibility: 'pub' },
                  { name: 'data', type: 'Data', visibility: 'pub' },
                  { name: 'bytes', type: 'Bytes', visibility: 'pub' },
                  { name: 'bytes_n', type: 'BytesN<32>', visibility: 'pub' },
                  { name: 'duration', type: 'Duration', visibility: 'pub' },
                  { name: 'map', type: 'Map<String, u32>', visibility: 'pub' },
                  { name: 'symbol', type: 'Symbol', visibility: 'pub' },
                  { name: 'timepoint', type: 'Timepoint', visibility: 'pub' },
                  { name: 'vec', type: 'Vec<u32>', visibility: 'pub' },
                ],
              },
              {
                name: 'OptionalData',
                fields: [
                  { name: 'maybe_u32', type: 'Option<u32>', visibility: 'pub' },
                  {
                    name: 'maybe_address',
                    type: 'Option<Address>',
                    visibility: 'pub',
                  },
                ],
              },
            ],
            enums: [
              {
                name: 'DataKey',
                variants: [
                  { name: 'Admin' },
                  { name: 'Counter' },
                  { name: 'Data' },
                  { name: 'Account', dataType: 'Address' },
                  { name: 'Contract', dataType: '(Address, u64)' },
                ],
                isError: false,
              },
              {
                name: 'ContractError',
                variants: [
                  { name: 'AdminNotFound', value: 1 },
                  { name: 'InvalidValue', value: 2 },
                  { name: 'OptionNotFound', value: 3 },
                ],
                isError: true,
              },
            ],
          },
          null,
          2,
        ),
      },
    ];
    ```

    ### Method Parameter Types

    The parser supports various parameter and return types. Note that the `env` parameter is automatically filtered out from the interface as it is provided by the Soroban blockchain environment.

    1. **Primitive Types**

    ```rust
    fn handle_primitives(value: u32, flag: bool) -> u64;
    ```

    Parsed as:

    ```json
    {
      "name": "handle_primitives",
      "parameters": [
        { "name": "value", "type": "u32" },
        { "name": "flag", "type": "bool" }
      ],
      "returnType": "u64"
    }
    ```

    2. **Custom Struct Types**

    ```rust
    fn handle_struct(data: Data) -> Data;
    ```

    Parsed as:

    ```json
    {
      "name": "handle_struct",
      "parameters": [{ "name": "data", "type": "Data" }],
      "returnType": "Data"
    }
    ```

    3. **Collections**

    ```rust
    fn handle_collections(map: Map<String, u32>, vec: Vec<u32>) -> (Map<String, u32>, Vec<u32>);
    ```

    Parsed as:

    ```json
    {
      "name": "handle_collections",
      "parameters": [
        { "name": "map", "type": "Map<String, u32>" },
        { "name": "vec", "type": "Vec<u32>" }
      ],
      "returnType": "(Map<String, u32>, Vec<u32>)"
    }
    ```

    4. **Optional Types**

    ```rust
    fn handle_optionals(maybe_u32: Option<u32>, maybe_address: Option<Address>) -> OptionalData;
    ```

    Parsed as:

    ```json
    {
      "name": "handle_optionals",
      "parameters": [
        { "name": "maybe_u32", "type": "Option<u32>" },
        { "name": "maybe_address", "type": "Option<Address>" }
      ],
      "returnType": "OptionalData"
    }
    ```

    5. **Result Types**

    ```rust
    fn handle_result() -> Result<Address, ContractError>;
    ```

    Parsed as:

    ```json
    {
      "name": "handle_result",
      "parameters": [],
      "returnType": "Result<Address, ContractError>"
    }
    ```

    6. **Complex Types**

    ```rust
    fn handle_complex(data: ComplexData) -> (Data, ComplexData);
    ```

    Parsed as:

    ```json
    {
      "name": "handle_complex",
      "parameters": [{ "name": "data", "type": "ComplexData" }],
      "returnType": "(Data, ComplexData)"
    }
    ```

    ### Note About the Env Parameter

    All contract methods in Soroban receive an `env` parameter that provides access to the blockchain environment. This parameter is automatically provided by the Soroban blockchain and is filtered out from the interface. For example, a method defined as:

    ```rust
    fn set_admin(env: Env, admin: Address) -> ();
    ```

    Will appear in the interface as:

    ```json
    {
      "name": "set_admin",
      "parameters": [{ "name": "admin", "type": "Address" }],
      "returnType": "()"
    }
    ```

## ⭐ Key Features

- 👤 Account management (creation, funding, balance checking)
- 🪙 Asset operations (creation, trustlines)
- 💸 Payment processing
- 📝 Transaction history retrieval
- 📱 Smart contract deployment and interaction
- 🌐 Support for both Stellar Classic and Soroban

## ⚙️ Configuration

### 🔑 Environment Variables

Create a `.env` file with the following configuration:

```env
STELLAR_SERVER_URL=
```

### 🔧 Configuration to use Stellar MCP Server

Here's the configuration to use the Stellar MCP server on Cursor, Windsurf, Claude Desktop:

#### 💻 Local

```json
{
  "mcpServers": {
    "stellar-mcp": {
      "command": "node",
      "args": ["your/path/stellar-mcp/dist/index.js"]
    }
  }
}
```

#### 📦 NPX

```json
{
  "mcpServers": {
    "stellar-mcp": {
      "command": "npx",
      "args": ["-y", "stellar-mcp"]
    }
  }
}
```

#### 🐳 Docker

```json
{
  "mcpServers": {
    "stellar": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--init",
        "-e",
        "STELLAR_SERVER_URL=<STELLAR_URL_VALUE>",
        "stellar-mcp"
      ]
    }
  }
}
```

### 📥 Installation

```bash
npm install
```

### 🔨 Build

```bash
npm run build
```

### 🚀 Run

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run start:prod
```

## 📚 Basic Example Usage

[Video TBD]

## 🔍 Debugging with MCP Inspector

To debug the Stellar MCP server and monitor all interactions between the LLM and the Stellar network, you can use the MCP Inspector. This tool provides a real-time view of all requests and responses.

### Running with MCP Inspector

Use the following command to start the server with the inspector:

```bash
npm run start:prod
```

```bash
npx @modelcontextprotocol/inspector node <your/path>/stellar-mcp npm run start:prod
```

This will start the MCP Inspector on port 9229. You can then open your browser and navigate to:

```
http://localhost:5173
```

The inspector will show you:

- All incoming requests from the LLM
- Outgoing responses and errors
- Real-time Stellar network interactions
- Detailed transaction information

This is particularly useful when:

- Debugging Stellar interactions
- Monitoring transaction flows
- Troubleshooting failed operations
- Understanding the sequence of API calls

## 📄 License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
