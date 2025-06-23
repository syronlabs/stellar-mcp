import { z } from 'zod';

import { Visibility } from '../../interfaces/soroban/ContractInterface.js';
import { IInvokeContractMethod } from '../../interfaces/soroban/InvokeContractMethod.js';

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

const ContractParameterSchema = z.object({
  name: z.string().describe('Name of the parameter'),
  type: z.string().describe('Type of the parameter'),
  value: z.string().describe('Value of the parameter'),
});

const ContractMethodSchema = z.object({
  name: z.string().describe('Name of the method'),
  parameters: z
    .array(ContractParameterSchema)
    .describe('Parameters for the method'),
  returnType: z.string().describe('Return type for the method'),
});

const ContractFieldSchema = z.object({
  name: z.string().describe('Name of the field'),
  type: z.string().describe('Type of the field'),
  visibility: z.nativeEnum(Visibility).describe('Visibility of the field'),
});

const ContractStructSchema = z.object({
  name: z.string().describe('Name of the struct'),
  fields: z.array(ContractFieldSchema).describe('Fields for the struct'),
});

const ContractEnumVariantSchema = z.object({
  name: z.string().describe('Name of the variant'),
  value: z.number().describe('Value of the variant'),
  dataType: z.string().describe('Data type of the variant'),
});

const ContractEnumSchema = z.object({
  name: z.string().describe('Name of the enum'),
  variants: z
    .array(ContractEnumVariantSchema)
    .describe('Variants for the enum'),
  isError: z.boolean().describe('Whether the enum is an error'),
});

export const InvokeContractMethodSchema = z.object({
  enums: z.array(ContractEnumSchema).describe('Enums for the method'),
  structs: z.array(ContractStructSchema).describe('Structs for the method'),
  contractAddress: z.string().describe('Address of the contract'),
  args: z
    .optional(z.array(ContractParameterSchema))
    .describe('Arguments for the method'),
  method: ContractMethodSchema.describe('Method to invoke'),
  secretKey: z
    .string()
    .describe('Secret key of the account to sign the transaction'),
}) satisfies z.ZodType<IInvokeContractMethod>;
