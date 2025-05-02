import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import * as schemas from '../stellar/classic/schemas.js';

export const stellarClassicTools: Tool[] = [
  {
    name: 'stellar_create_account',
    description: 'Create a new Stellar Account',
    inputSchema: zodToJsonSchema(schemas.AccountKeyPairSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_balance',
    description: 'Get the balance of a Stellar Account',
    inputSchema: zodToJsonSchema(
      z.object({
        account: z
          .string()
          .describe('The public key of the account to check balance'),
      }),
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_payment',
    description: 'Send a payment to another account',
    inputSchema: zodToJsonSchema(schemas.PaymentParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_transactions',
    description: 'Get transaction history for an account',
    inputSchema: zodToJsonSchema(
      z.object({
        account: z
          .string()
          .describe('The account public key to get transactions for'),
      }),
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_create_asset',
    description: 'Create a new asset on the Stellar network',
    inputSchema: zodToJsonSchema(schemas.AssetParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_change_trust',
    description: 'Change trustline for an asset',
    inputSchema: zodToJsonSchema(schemas.TrustlineParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'stellar_fund_account',
    description: 'Fund a test account using the Friendbot',
    inputSchema: zodToJsonSchema(
      z.object({
        publicKey: z.string().describe('The public key of the account to fund'),
      }),
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_create_claimable_balance',
    description: 'Create a new claimable balance',
    inputSchema: zodToJsonSchema(
      schemas.CreateClaimableBalanceParamsSchema,
    ) as { type: 'object'; properties: Record<string, unknown> },
  },
  {
    name: 'stellar_claim_claimable_balance',
    description: 'Claim a claimable balance',
    inputSchema: zodToJsonSchema(schemas.ClaimClaimableBalanceParamsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
];
