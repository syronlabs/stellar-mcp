import { resolve } from "path";
import { z } from "zod";

import { OutputMessage } from "../../../interfaces/common.interface";
import { Classic } from "../../classic/classic";
import { AccountKeyPairSchema } from "../../classic/schemas";
import { BuildAndOptimizeSchema } from "../schemas";
import { Soroban } from "../soroban";

function getContractAddress(result: OutputMessage[]): string {
  return (
    result
      .find((r) => r.text.includes("Contract deployed successfully"))
      ?.text.split(":")[1]
      .trim() ?? ""
  );
}

describe("Soroban Operations", () => {
  const serverUrl = "https://horizon-testnet.stellar.org";
  const soroban = new Soroban(serverUrl);
  const classic = new Classic(serverUrl);
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

  describe("Deploy Contract", () => {
    let testAccount: z.infer<typeof AccountKeyPairSchema>;

    beforeAll(async () => {
      testAccount = await classic.createAccount();
      await classic.fundAccount({ publicKey: testAccount.publicKey });
    });

    it("Should deploy a contract without constructor", async () => {
      const result = await soroban.deploy({
        wasmPath: resolve(
          __dirname,
          "./fixture/test_contract/target/wasm32-unknown-unknown/release/hello_world.wasm",
        ),
        secretKey: testAccount.secretKey,
      });

      const contractAddress = result
        .find((r) => r.text.includes("Contract deployed successfully"))
        ?.text.split(":")[1]
        .trim();

      const successMessage = result.find((r) =>
        r.text.includes("Deployed!"),
      )?.text;

      expect(contractAddress).toBeDefined();
      expect(contractAddress).toMatch(/^C[A-Z0-9]{55}$/);
      expect(successMessage).toBeDefined();
    });

    it("Should deploy a contract with constructor", async () => {
      const result = await soroban.deploy({
        wasmPath: resolve(
          __dirname,
          "./fixture/test_contract/target/wasm32-unknown-unknown/release/contract_with_constructor.wasm",
        ),
        secretKey: testAccount.secretKey,
        constructorArgs: [
          {
            name: "admin",
            type: "Address",
            value: testAccount.publicKey,
          },
        ],
      });

      const contractAddress = result
        .find((r) => r.text.includes("Contract deployed successfully"))
        ?.text.split(":")[1]
        .trim();

      const successMessage = result.find((r) =>
        r.text.includes("Deployed!"),
      )?.text;

      expect(contractAddress).toBeDefined();
      expect(contractAddress).toMatch(/^C[A-Z0-9]{55}$/);
      expect(successMessage).toBeDefined();
    });

    it("Should fail if the contract address is not valid", async () => {
      const result = await soroban.deploy({
        wasmPath: resolve(
          __dirname,
          "./fixture/test_contract/target/wasm32-unknown-unknown/release/fake_contract.wasm",
        ),
        secretKey: testAccount.secretKey,
      });

      const errorMessage = result.find((r) =>
        r.text.includes("❌ error: reading file"),
      );

      expect(errorMessage).toBeDefined();
    });

    it("Should fail if the contract has a constructor but no arguments were provided", async () => {
      const result = await soroban.deploy({
        wasmPath: resolve(
          __dirname,
          "./fixture/test_contract/target/wasm32-unknown-unknown/release/contract_with_constructor.wasm",
        ),
        secretKey: testAccount.secretKey,
      });

      const errorMessage = result.find((r) =>
        r.text.includes("❌ Error in deploy process"),
      )?.text;

      expect(errorMessage).toBeDefined();
      expect(errorMessage).toContain(
        "⚠️ Contract has a constructor but no arguments were provided",
      );
    });
  });

  describe("Retrieve Contract Methods", () => {
    let testAccount: z.infer<typeof AccountKeyPairSchema>;

    beforeAll(async () => {
      testAccount = await classic.createAccount();
      await classic.fundAccount({ publicKey: testAccount.publicKey });
    });

    it("Should retrieve contract methods without constructor", async () => {
      const deployResult = await soroban.deploy({
        wasmPath: resolve(
          __dirname,
          "./fixture/test_contract/target/wasm32-unknown-unknown/release/hello_world.wasm",
        ),
        secretKey: testAccount.secretKey,
      });

      const contractAddress = getContractAddress(deployResult);
      const result = await soroban.retrieveContractMethods({
        contractAddress,
        secretKey: testAccount.secretKey,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      const methodEntries = result.filter(
        (item) => item.type === "text" && item.text.startsWith('Method: "'),
      );

      const methodTexts = methodEntries.map((entry) => entry.text);

      expect(methodTexts).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Method: "hello"; Arguments: to: String'),
        ]),
      );
    });

    it("Should retrieve contract methods with constructor", async () => {
      const deployResult = await soroban.deploy({
        wasmPath: resolve(
          __dirname,
          "./fixture/test_contract/target/wasm32-unknown-unknown/release/contract_with_constructor.wasm",
        ),
        secretKey: testAccount.secretKey,
        constructorArgs: [
          {
            name: "admin",
            type: "Address",
            value: testAccount.publicKey,
          },
        ],
      });

      const contractAddress = getContractAddress(deployResult);

      const result = await soroban.retrieveContractMethods({
        contractAddress,
        secretKey: testAccount.secretKey,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      const methodEntries = result.filter(
        (item) => item.type === "text" && item.text.startsWith('Method: "'),
      );

      expect(methodEntries.length).toBeGreaterThan(0);

      const methodTexts = methodEntries.map((entry) => entry.text);

      expect(methodTexts).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Method: "set_admin"; Arguments: admin: Address',
          ),
          expect.stringContaining(
            'Method: "get_admin"; Arguments: No arguments',
          ),
          expect.stringMatching(
            /Method: "method_with_args"; Arguments: (arg1: u32, arg2: u32|arg2: u32, arg1: u32)/,
          ),
          expect.stringContaining(
            'Method: "struct_as_arg"; Arguments: arg: { admin: Address }',
          ),
          expect.stringContaining(
            'Method: "struct_as_arg_deep"; Arguments: arg: { admin: Address, data: { admin: Address } }',
          ),
        ]),
      );
    });
  });
});
