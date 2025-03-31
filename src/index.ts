#!/usr/bin/env node

import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequest,
  CallToolResult,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Classic } from "./stellar/classic/classic.js";
import { tools } from "./tools/tools.js";

dotenv.config();

const server = new Server({
  name: "stellar-mcp",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
  try {
    const stellarServer = process.env.STELLAR_SERVER_URL!
    const stellarClassic = new Classic(stellarServer);

    switch (name) {
      case "stellar_create_account":
        const account = await stellarClassic.createAccount();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(account, null, 2)
          }]
        };
      case "stellar_balance":
        const balance = await stellarClassic.getBalance(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(balance, null, 2)
          }]
        };
      case "stellar_payment":
        const payment = await stellarClassic.createPayment(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(payment, null, 2)
          }]
        };
      case "stellar_transactions":
        const transactions = await stellarClassic.getTransactions(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(transactions, null, 2)
          }]
        };
      case "stellar_create_asset":
        const createAsset = await stellarClassic.createAsset(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(createAsset, null, 2)
          }]
        };
      case "stellar_change_trust":
        const changeTrust = await stellarClassic.changeTrust(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(changeTrust, null, 2)
          }]
        };
      case "stellar_fund_account":
        const fundAccount = await stellarClassic.fundAccount(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(fundAccount, null, 2)
          }]
        };
      case "stellar_create_claimable_balance":
        const createClaimableBalance = await stellarClassic.createClaimableBalance(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(createClaimableBalance, null, 2)
          }]
        };
      case "stellar_claim_claimable_balance":
        const claimClaimableBalance = await stellarClassic.claimClaimableBalance(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(claimClaimableBalance, null, 2)
          }]
        };
      default:
        throw new Error(`Tool ${name} not found`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message || error}`
      }],
      isError: true,
    }
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    if (!request.params.arguments) {
      throw new Error("No parameters provided");
    }
    const { name, arguments: args } = request.params;
    return await handleToolCall(name, args ?? {});
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message || error}`
      }],
      isError: true,
    }
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Stellar MCP server running");
}

main().catch(console.error);

process.stdin.on("close", () => {
  console.error("Stellar MCP Server closed");
  server.close();
});
