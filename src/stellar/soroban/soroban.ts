import { Networks, rpc } from "@stellar/stellar-sdk";
import { exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function readWasmFile(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("base64");
}

export enum GetTransactionStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  NOT_FOUND = "NOT_FOUND",
}

type BuildAndOptimizeMessage = {
  type: "text";
  text: string;
};

export class Soroban {
  private server: rpc.Server;
  private networkPassphrase: string;
  private networkConfig: {
    [key: string]: { server: rpc.Server; networkPassphrase: string };
  };

  constructor(serverUrl: string) {
    this.networkConfig = {
      testnet: {
        server: new rpc.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.TESTNET,
      },
      public: {
        server: new rpc.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.PUBLIC,
      },
      futurenet: {
        server: new rpc.Server(serverUrl, { allowHttp: true }),
        networkPassphrase: Networks.FUTURENET,
      },
    };

    const network = serverUrl.includes("testnet")
      ? "testnet"
      : serverUrl.includes("futurenet")
        ? "futurenet"
        : "public";
    const config = this.networkConfig[network];
    this.server = config.server;
    this.networkPassphrase = config.networkPassphrase;
  }

  private async executeBuildCommand(
    contractPath: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const command = `cd ${contractPath} && stellar contract build`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("Error:", error);
          resolve({ stdout, stderr });
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  private async findWasmFiles(wasmDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const platform = os.platform();
      const findCommand =
        platform === "win32"
          ? `dir /b "${wasmDir}\\*.wasm"`
          : `find "${wasmDir}" -maxdepth 1 -name "*.wasm"`;

      exec(findCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error finding WASM files:", error);
          reject(error);
          return;
        }

        const wasmFiles = stdout
          .trim()
          .split("\n")
          .filter((file) => file.endsWith(".wasm"));

        resolve(wasmFiles);
      });
    });
  }

  private async optimizeWasmFile(
    contractPath: string,
    wasmFile: string,
  ): Promise<{
    file: string;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve) => {
      const optimizeCommand = `cd ${contractPath} && stellar contract optimize --wasm target/wasm32-unknown-unknown/release/${wasmFile}`;
      exec(optimizeCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error optimizing ${wasmFile}:`, error);
          resolve({
            file: wasmFile,
            stdout: "",
            stderr: `Error optimizing ${wasmFile}: ${error.message || error}`,
          });
          return;
        }
        resolve({
          file: wasmFile,
          stdout,
          stderr,
        });
      });
    });
  }

  private formatBuildOutput(
    stdout: string,
    stderr: string,
    contractPath: string,
  ): Array<{ type: string; text: string }> {
    const messages: Array<{ type: string; text: string }> = [
      { type: "text", text: "🚀 Starting contract build process..." },
      { type: "text", text: `📦 Building contract in: ${contractPath}` },
      ...this.formatStdoutOutput(stdout),
      ...this.formatStderrOutput(stderr),
    ];

    return messages;
  }

  private formatStdoutOutput(
    stdout: string,
  ): Array<{ type: string; text: string }> {
    return stdout.split("\n").map((line) => ({
      type: "text",
      text: line.trim(),
    }));
  }

  private formatStderrOutput(
    stderr: string,
  ): Array<{ type: string; text: string }> {
    return stderr.split("\n").map((line) => ({
      type: "text",
      text: line.trim(),
    }));
  }

  private formatOptimizationResults(
    results: Array<{ file: string; stdout: string; stderr: string }>,
  ): Array<{ type: string; text: string }> {
    return results.map((result) => ({
      type: "text",
      text: `🔧 Optimizing ${path.basename(result.file)}\n${result.stdout}\n${result.stderr}`,
    }));
  }

  async buildAndOptimize(params: {
    contractPath: string;
  }): Promise<BuildAndOptimizeMessage[]> {
    try {
      const { contractPath = process.cwd() } = params;

      const { stdout, stderr } = await this.executeBuildCommand(contractPath);

      const wasmDir = path.join(
        contractPath,
        "target/wasm32-unknown-unknown/release",
      );
      if (!fs.existsSync(wasmDir)) {
        const messages = this.formatBuildOutput(
          stdout,
          stderr,
          contractPath,
        ) as BuildAndOptimizeMessage[];

        messages.push({
          type: "text",
          text: "❌ Error: No WASM directory found after build",
        });

        messages.push({
          type: "text",
          text: "💡 Tip: Check if the build process completed successfully",
        });

        return messages;
      }

      const wasmFiles = await this.findWasmFiles(wasmDir);
      if (!wasmFiles.length) {
        const messages = this.formatBuildOutput(
          stdout,
          stderr,
          contractPath,
        ) as BuildAndOptimizeMessage[];

        messages.push({
          type: "text",
          text: "❌ No WASM files found to optimize",
        });

        messages.push({
          type: "text",
          text: "💡 Tip: Check if the build process generated any WASM files",
        });

        return messages;
      }

      const optimizationResults = await Promise.all(
        wasmFiles.map((file) =>
          this.optimizeWasmFile(contractPath, file).catch((error) => ({
            file,
            stdout: "",
            stderr: `Error optimizing ${file}: ${error.message || error}`,
          })),
        ),
      );

      const messages = this.formatBuildOutput(
        stdout,
        stderr,
        contractPath,
      ) as BuildAndOptimizeMessage[];

      messages.push({
        type: "text",
        text: `✨ Found ${optimizationResults.length} WASM file(s) to optimize`,
      });

      messages.push(
        ...(this.formatOptimizationResults(
          optimizationResults,
        ) as BuildAndOptimizeMessage[]),
      );

      messages.push({
        type: "text",
        text: optimizationResults.some((r) => r.stderr.includes("Error"))
          ? "⚠️ Build completed with optimization errors"
          : "✅ Build and optimization completed successfully!",
      });

      return messages;
    } catch (error) {
      console.error("Error in build and optimize process:", error);
      throw error;
    }
  }
}
