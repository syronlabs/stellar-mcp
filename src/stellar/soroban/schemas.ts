import { z } from 'zod';

export const BuildAndOptimizeSchema = z.object({
  contractPath: z
    .string()
    .describe('Path to the contract to build and optimize'),
});

export const DeploySchema = z.object({
  wasmPath: z.string().describe('Path to the WASM file to deploy'),
  secretKey: z
    .string()
    .describe('Secret key of the account to sign the transaction'),
  constructorArgs: z
    .optional(
      z.array(
        z.object({
          name: z.string().describe('Name of the argument'),
          type: z.string().describe('Type of the argument'),
          value: z.string().describe('Value of the argument'),
        }),
      ),
    )
    .describe('Constructor arguments for the contract'),
});

export const GetContractMethodsSchema = z.object({
  contractAddress: z.string().describe('Address of the contract'),
});
