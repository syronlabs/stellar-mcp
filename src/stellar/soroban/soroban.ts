import { rpc } from "@stellar/stellar-sdk";
import { exec } from "child_process";

import getNetworkConfig from "../../config/environment.config.js";
import { OutputMessage, Platform } from "../../interfaces/common.interface.js";
import { DeployContractArgs } from "../../interfaces/soroban/DeployContractArgs.js";
import { ConstructorArg } from "../../interfaces/soroban/DeployContractArgs.js";
import { GetContractMethodsArgs } from "../../interfaces/soroban/GetContractMethods.js";
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
        wasmPath,
        contractPath,
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
  async retrieveContractMethods(
    params: GetContractMethodsArgs,
  ): Promise<OutputMessage[]> {
    try {
      const { contractAddress, secretKey } = params;
      const messages = this.createInitialMessage(contractAddress);

      const contractMethods = await this.getContractMethods(
        contractAddress,
        secretKey,
      );

      const methodsWithArgs = await this.getMethodArguments(
        contractAddress,
        secretKey,
        contractMethods,
      );

      methodsWithArgs.forEach((method) => {
        messages.push({
          type: "text",
          text: `Method: "${method.method}"; Arguments: ${method.args.length > 0 ? method.args.map((arg) => `${arg.name}: ${arg.type}`).join(", ") : "No arguments"}`,
        });
      });

      return messages;
    } catch (error) {
      console.error("Error in retrieve contract methods process:", error);
      throw error;
    }
  }

  private createInitialMessage(contractAddress: string): OutputMessage[] {
    return [
      {
        type: "text",
        text: `🚀 Retrieving contract methods for address: ${contractAddress}`,
      },
    ];
  }

  private async getContractMethods(
    contractAddress: string,
    secretKey: string,
  ): Promise<string[]> {
    const command = this.getCommand("contractInfo", {
      contractId: contractAddress,
      network: this.network,
      secretKey,
    });

    return new Promise<string[]>((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          console.error("Error retrieving contract methods:", error);
          reject(error);
        }
        const methods = this.parseContractInfo(stdout);
        resolve(methods);
      });
    });
  }

  private async getMethodArguments(
    contractAddress: string,
    secretKey: string,
    methods: string[],
  ): Promise<
    Array<{ method: string; args: Array<{ name: string; type: string }> }>
  > {
    const methodArgs = methods.map(async (method) => {
      const command = this.getCommand("contractMethod", {
        contractId: contractAddress,
        network: this.network,
        secretKey,
        method,
      });

      return new Promise<{
        method: string;
        args: Array<{ name: string; type: string }>;
      }>((resolve, reject) => {
        exec(command, (error, stdout) => {
          if (error) {
            console.error("Error retrieving method arguments:", error);
            reject(error);
          }
          const args = this.parseContractArgs(stdout.split("\n"));
          resolve({ method, args });
        });
      });
    });

    return Promise.all(methodArgs);
  }

  private parseContractInfo(stdout: string): string[] {
    const lines = stdout.split("\n").map((line) => line.trim());
    const commandsIndex = lines.findIndex((line) =>
      line.startsWith("Commands:"),
    );
    const helpIndex = lines.findIndex((line) => line.startsWith("help"));

    return lines
      .slice(commandsIndex + 1, helpIndex)
      .filter((method) => !method.includes("__constructor"))
      .map((method) => method.replace("  - ", ""));
  }

  private parseContractArgs(
    output: string[],
  ): Array<{ name: string; type: string }> {
    const optionsStartIndex = output.findIndex((line) => line === "Options:");
    if (optionsStartIndex === -1) return [];

    return output
      .slice(optionsStartIndex + 1)
      .map((line) => line.trim())
      .filter(this.isValidArgumentLine)
      .map(this.parseArgumentLine)
      .filter((arg): arg is { name: string; type: string } => arg !== null);
  }

  private isValidArgumentLine(line: string): boolean {
    if (!line) return false;
    if (line.startsWith("-h")) return false;
    if (line.startsWith("Usage:")) return false;
    if (line.startsWith("Example:")) return false;
    if (line.startsWith("Usage Notes:")) return false;
    return true;
  }

  private parseArgumentLine(
    line: string,
  ): { name: string; type: string } | null {
    const match = line.match(/^--([a-zA-Z0-9_]+)\s*<([^>]+)>$/);
    if (!match) return null;

    return {
      name: match[1],
      type: match[2],
    };
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
    const contractMessage = messages
      .filter((m) => m.text.length > 0)
      .find((message) => message.text.startsWith("C"));

    if (!contractMessage) {
      return messages;
    }

    const contractAddress = contractMessage.text;

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

  private parseConstructorArgs(args: string): ConstructorArg[] {
    return args
      .split(",")
      .slice(1)
      .map(this.parseArgument)
      .filter((arg): arg is ConstructorArg => arg !== null);
  }

  private parseArgument(arg: string): ConstructorArg | null {
    const [name, type] = arg
      .trim()
      .split(": ")
      .map((part) => part?.trim());

    if (!name || !type) {
      return null;
    }

    return {
      name,
      type,
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
