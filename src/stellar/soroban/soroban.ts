import { rpc } from "@stellar/stellar-sdk";
import { exec } from "child_process";

import getNetworkConfig from "../../config/environment.config.js";
import { OutputMessage, Platform } from "../../interfaces/common.interface.js";
import { DeployContractArgs } from "../../interfaces/soroban/DeployContractArgs.js";
import { ConstructorArg } from "../../interfaces/soroban/DeployContractArgs.js";
import { Core } from "../core/core.js";

export class Soroban extends Core {
  private server: rpc.Server;
  private network: string;
  private networkPassphrase: string;
  private networkConfig: {
    [key: string]: {
      server: rpc.Server;
      networkPassphrase: string;
    };
  };

  constructor(serverUrl: string) {
    super();
    this.networkConfig = getNetworkConfig(serverUrl);

    const network = serverUrl.includes("testnet")
      ? "testnet"
      : serverUrl.includes("futurenet")
        ? "futurenet"
        : "public";
    const config = this.networkConfig[network];
    this.server = config.server;
    this.networkPassphrase = config.networkPassphrase;
    this.network = network;
  }

  private async executeBuildCommand(
    contractPath: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const command = this.getCommand("build", { path: contractPath });
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("Error:", error);
          if (
            this.platform !== Platform.WINDOWS &&
            !stderr.includes("could not find `Cargo.toml`")
          ) {
            stderr = "The system cannot find the path specified";
          }

          resolve({ stdout, stderr });
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  private async findWasmFiles(wasmDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const findCommand = this.getCommand("find", {
        path: wasmDir,
        pattern: "*.wasm",
      });

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
      const wasmPath =
        this.platform === Platform.WINDOWS
          ? `target/wasm32-unknown-unknown/release/${wasmFile}`
          : wasmFile;

      const optimizeCommand = this.getCommand("optimize", {
        wasmPath: this.joinPath(contractPath, wasmPath),
      });

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

  private formatOptimizationResults(
    results: Array<{ file: string; stdout: string; stderr: string }>,
  ): Array<{ type: string; text: string }> {
    return results.map((result) => ({
      type: "text",
      text: `🔧 Optimizing ${this.getBasePath(result.file)}\n${result.stdout}\n${result.stderr}`,
    }));
  }

  async buildAndOptimize(params: {
    contractPath: string;
  }): Promise<OutputMessage[]> {
    try {
      const { contractPath = process.cwd() } = params;

      const { stdout, stderr } = await this.executeBuildCommand(contractPath);

      const wasmDir = this.resolvePath(
        contractPath,
        "target/wasm32-unknown-unknown/release",
      );
      if (!this.exists(wasmDir)) {
        const messages = this.formatBuildOutput(
          stdout,
          stderr,
          contractPath,
        ) as OutputMessage[];

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
        ) as OutputMessage[];

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
      ) as OutputMessage[];

      messages.push({
        type: "text",
        text: `✨ Found ${optimizationResults.length} WASM file(s) to optimize`,
      });

      messages.push(
        ...(this.formatOptimizationResults(
          optimizationResults,
        ) as OutputMessage[]),
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

  async deploy(params: DeployContractArgs): Promise<OutputMessage[]> {
    try {
      await this.checkContractConstructorArgs(params);

      const messages = this.createDeploymentMessages();

      const deploymentResult = await this.deployUsingStellarCLI(params);

      deploymentResult.forEach((message) => {
        this.addMessage(messages, message.text);
      });

      return messages;
    } catch (error: unknown) {
      const errorMessage = this.createDeploymentMessages();

      errorMessage.push({
        type: "text",
        text: `❌ Error in deploy process: ${error instanceof Error ? error.message : String(error)}`,
      });

      return errorMessage;
    }
  }

  private createDeploymentMessages(): OutputMessage[] {
    return [
      {
        type: "text",
        text: `🚀 Starting contract deployment...`,
      },
    ];
  }

  private async deployUsingStellarCLI({
    wasmPath,
    secretKey,
    constructorArgs,
  }: DeployContractArgs): Promise<OutputMessage[]> {
    const command = this.getCommand("deploy", {
      wasmPath,
      secretKey,
      network: this.network,
      constructorArgs: constructorArgs
        ? this.resolveConstructorArgs(constructorArgs)
        : "",
    });

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("Error deploying contract:", error);
          resolve(this.formatErrorOutput(stderr));
          return;
        }
        const formattedStderr = this.formatStderrOutput(stderr);
        const formattedStdout = this.formatStdoutOutput(stdout);

        const messages = [
          ...formattedStderr,
          ...this.formatContractDeploymentMessage(formattedStdout),
        ];

        resolve(messages);
      });
    });
  }

  private formatContractDeploymentMessage(
    messages: OutputMessage[],
  ): OutputMessage[] {
    const constractMessage = messages
      .filter((m) => m.text.length > 0)
      .find((message) => message.text.startsWith("C"));

    if (!constractMessage) {
      return messages;
    }

    const contractAddress = constractMessage.text;

    return [
      {
        type: "text",
        text: `Contract deployed successfully at address: ${contractAddress}`,
      },
    ];
  }

  private async checkContractConstructorArgs(
    params: DeployContractArgs,
  ): Promise<void> {
    const { result } = await this.resolveContractArgs(params.wasmPath);

    if (result && !params.constructorArgs) {
      throw new Error(
        `⚠️ Contract has a constructor but no arguments were provided`,
      );
    }
  }

  private async resolveContractArgs(
    contractPath: string,
  ): Promise<{ result: boolean; args: ConstructorArg[] }> {
    const packageName = this.resolvePacakgeName(contractPath);
    const contractArgs = this.readContractArgs(contractPath, packageName);

    if (contractArgs.length > 0) {
      return { result: true, args: contractArgs };
    }

    return { result: false, args: [] };
  }

  private readContractArgs(
    contractPath: string,
    packageName: string,
    currentPath?: string,
  ): ConstructorArg[] {
    const srcDir =
      currentPath || this.resolvePath(contractPath, "../../../../");
    const entries = this.readDir(srcDir);
    const packageNameInKebabCase = this.fromSnakeCaseToKebabCase(packageName);

    for (const entry of entries) {
      const fullPath = this.resolvePath(srcDir, entry);
      const constructorArgs = this.extractConstructorArgsFromFile(
        fullPath,
        entry,
      );

      if (constructorArgs.length > 0) {
        return constructorArgs;
      }

      if (this.shouldSearchDirectory(fullPath, entry, packageNameInKebabCase)) {
        const nestedArgs = this.readContractArgs(
          contractPath,
          packageName,
          fullPath,
        );
        if (nestedArgs.length > 0) {
          return nestedArgs;
        }
      }
    }

    return [];
  }

  private extractConstructorArgsFromFile(
    filePath: string,
    fileName: string,
  ): ConstructorArg[] {
    if (!fileName.endsWith(".rs")) {
      return [];
    }

    const content = this.readFile<string>(filePath);
    const constructorMatch = content.match(/pub fn __constructor\(([^)]+)\)/);
    if (!constructorMatch) {
      return [];
    }

    return this.parseConstructorArgs(constructorMatch[1]);
  }

  private parseConstructorArgs(argsString: string): ConstructorArg[] {
    return argsString
      .split(",")
      .slice(1) // Remove env parameter
      .map(this.parseArgument)
      .filter((arg): arg is ConstructorArg => arg !== null);
  }

  private parseArgument(arg: string): ConstructorArg | null {
    const parts = arg.trim().split(": ");
    if (parts.length !== 2) {
      return null;
    }
    return {
      name: parts[0],
      type: parts[1],
    };
  }

  private shouldSearchDirectory(
    fullPath: string,
    directoryName: string,
    packageNameInKebabCase: string,
  ): boolean {
    return (
      this.isDirectory(fullPath) &&
      (fullPath.includes(packageNameInKebabCase) ||
        directoryName === "contracts")
    );
  }

  private verifyPackageName(contractPath: string): void {
    const packageName = this.readFile<string>(
      this.resolvePath(contractPath, "Cargo.toml"),
    );
  }

  private resolveConstructorArgs(constructorArgs: ConstructorArg[]): string {
    return constructorArgs
      .map((arg) => `--${arg.name} ${arg.value}`)
      .join(", ");
  }

  private resolvePacakgeName(contractPath: string): string {
    return contractPath.split(/[/\\]/).pop()?.split(".")[0] || "";
  }

  private fromSnakeCaseToKebabCase(str: string): string {
    return str.replace(/_/g, "-");
  }
}
