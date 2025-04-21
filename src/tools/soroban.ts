import { Tool } from "@modelcontextprotocol/sdk/types";
import zodToJsonSchema from "zod-to-json-schema";

import * as schemas from "../stellar/soroban/schemas.js";

export const sorobanTools: Tool[] = [
  {
    name: "soroban_build_and_optimize",
    description: "Build and optimize a Soroban contract",
    inputSchema: zodToJsonSchema(schemas.BuildAndOptimizeSchema) as {
      type: "object";
      properties: Record<string, unknown>;
    },
  },
];
