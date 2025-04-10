import { z } from "zod";

export const BuildAndOptimizeSchema = z.object({
  contractPath: z
    .string()
    .describe("Path to the contract to build and optimize"),
});
