import { Tool } from '@modelcontextprotocol/sdk/types.js';
import zodToJsonSchema from 'zod-to-json-schema';

import * as schemas from '../stellar/soroban/schemas.js';

export const sorobanTools: Tool[] = [
  {
    name: 'soroban_build_and_optimize',
    description: 'Build and optimize a Soroban contract',
    inputSchema: zodToJsonSchema(schemas.BuildAndOptimizeSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'soroban_deploy',
    description: 'Deploy a Soroban contract',
    inputSchema: zodToJsonSchema(schemas.DeploySchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'soroban_retrieve_contract_methods',
    description: 'Retrieve the methods of a Soroban contract',
    inputSchema: zodToJsonSchema(schemas.GetContractMethodsSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
  {
    name: 'soroban_invoke_contract_method',
    description: 'Invoke a method of a Soroban contract',
    inputSchema: zodToJsonSchema(schemas.InvokeContractMethodSchema) as {
      type: 'object';
      properties: Record<string, unknown>;
    },
  },
];
