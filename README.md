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

#### 📝 [WIP] Soroban Smart Contract Operations
- **stellar_deploy_contract** 
  - Deploy a contract to the Stellar network
  - Inputs:
    - `wasmBuffer` (string, required): The WASM buffer of the contract (base64 encoded)
    - `sourceSecretKey` (string, required): The secret key of the source account

- **stellar_invoke_contract**
  - Invoke a contract on the Stellar network
  - Input: `contractId` (string): The ID of the contract to invoke

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
