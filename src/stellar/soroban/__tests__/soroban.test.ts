import { resolve } from "path";
import { z } from "zod";

import { BuildAndOptimizeSchema } from "../schemas";
import { Soroban } from "../soroban";

describe("Soroban Operations", () => {
  const serverUrl = "https://horizon-testnet.stellar.org";
  const soroban = new Soroban(serverUrl);
  let path: z.infer<typeof BuildAndOptimizeSchema>;

  beforeEach(async () => {
    path = { contractPath: resolve(__dirname, "./fixture/test_contract") };
  });

  describe("Build and Optimize", () => {
    const BUILD_TIMEOUT = 60000;

    it(
      "Should build and optimize a contract",
      async () => {
        const result = await soroban.buildAndOptimize(path);

        const finishedMessage = result.find((r) =>
          r.text.includes("Finished `release`"),
        );

        const contractWasmFile = result.find((r) =>
          r.text.includes("Optimizing hello_world.wasm"),
        );

        const successMessage = result.find((r) =>
          r.text.includes("Build and optimization completed successfully!"),
        );

        expect(finishedMessage).toBeDefined();
        expect(contractWasmFile).toBeDefined();
        expect(successMessage).toBeDefined();
      },
      BUILD_TIMEOUT,
    );

    it("Should fail if the path to the contract is invalid", async () => {
      const result = await soroban.buildAndOptimize({
        contractPath: resolve(__dirname, "./fixture/invalid_path"),
      });

      const pathErrorMessage = result.find((r) =>
        r.text.includes("The system cannot find the path specified"),
      );

      const errorMessage = result.find((r) =>
        r.text.includes("Error: No WASM directory found after build"),
      );

      expect(pathErrorMessage).toBeDefined();
      expect(errorMessage).toBeDefined();
    });

    it("Should fail if the path exists but there is no a valid contract", async () => {
      const result = await soroban.buildAndOptimize({
        contractPath: resolve(__dirname, "./fixture"),
      });

      const noContractPathErrorMessage = result.find((r) =>
        r.text.includes(
          "error: `cargo metadata` exited with an error: error: could not find",
        ),
      );

      expect(noContractPathErrorMessage).toBeDefined();
    });
  });
});
