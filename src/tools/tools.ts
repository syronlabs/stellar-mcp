import { Tool } from "@modelcontextprotocol/sdk/types";

import { stellarClassicTools } from "./classic.js";
import { sorobanTools } from "./soroban.js";

export const tools: Tool[] = [...stellarClassicTools, ...sorobanTools];
