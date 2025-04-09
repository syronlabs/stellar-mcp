import { z } from "zod";

export const BuildAndOptimizeSchema = z.object({
  contractPath: z.string(),
});
