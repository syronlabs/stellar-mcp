import { rpc } from '@stellar/stellar-sdk';

import getNetworkConfig from '../../config/environment.config.js';
import {
  ICommandResult,
  OutputMessage,
  Platform,
} from '../../interfaces/common.interface.js';
import { IContractInterface } from '../../interfaces/soroban/ContractInterface';
import { IDeployContractArgs } from '../../interfaces/soroban/DeployContractArgs.js';
import { IConstructorArg } from '../../interfaces/soroban/DeployContractArgs.js';
import { ErrorType } from '../../interfaces/soroban/Error.js';
import { IGetContractMethodsArgs } from '../../interfaces/soroban/GetContractMethods.js';
import {
  IInvokeContractMethod,
  IInvokeContractMethodArgs,
} from '../../interfaces/soroban/InvokeContractMethod.js';
import { ContractParser } from '../core/contractParser.js';
import { Core } from '../core/core.js';
import { SorobanValidationService } from '../services/validation.service.js';

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
  private readonly validationService: SorobanValidationService;

  constructor(serverUrl: string) {
    super();
    this.networkConfig = getNetworkConfig(serverUrl);
    this.validationService = new SorobanValidationService();

    const network = serverUrl.includes('testnet')
      ? 'testnet'
      : serverUrl.includes('futurenet')
        ? 'futurenet'
        : 'public';
    const config = this.networkConfig[network];
    this.server = config.server;
    this.networkPassphrase = config.networkPassphrase;
    this.network = network;
  }

  private async findWasmFiles(wasmDir: string): Promise<string[]> {
    const findCommand = this.getCommand('find', {
      path: wasmDir,
      pattern: '*.wasm',
    });

    const { error, stdout, stderr } = await this.executeCommand(findCommand);

    if (error) {
      console.error('Error finding WASM files:', error);
      throw new Error(`Error finding WASM files: ${stderr}`);
    }

    const wasmFiles = stdout
      .trim()
      .split('\n')
      .filter((file) => file.endsWith('.wasm'));

    return wasmFiles;
  }

  private async optimizeWasmFile(
    contractPath: string,
    wasmFile: string,
  ): Promise<{
    file: string;
    stdout: string;
    stderr: string;
  }> {
    const wasmPath =
      this.platform === Platform.WINDOWS
        ? `target/wasm32-unknown-unknown/release/${wasmFile}`
        : wasmFile;

    const optimizeCommand = this.getCommand('optimize', {
      wasmPath,
      contractPath,
    });

    const { error, stdout, stderr } =
      await this.executeCommand(optimizeCommand);

    const result = {
      file: wasmFile,
      stdout,
      stderr,
    };

    if (error) {
      console.error(`Error optimizing ${wasmFile}:`, error);
      result.stderr = `Error optimizing ${wasmFile}: ${error.message || error}`;
    }

    return result;
  }

  private formatBuildOutput(
    stdout: string,
    stderr: string,
    contractPath: string,
  ): Array<{ type: string; text: string }> {
    const messages: Array<{ type: string; text: string }> = [
      { type: 'text', text: '🚀 Starting contract build process...' },
      { type: 'text', text: `📦 Building contract in: ${contractPath}` },
      ...this.formatStdoutOutput(stdout),
      ...this.formatStderrOutput(stderr),
    ];

    return messages;
  }

  private formatOptimizationResults(
    results: Array<{ file: string; stdout: string; stderr: string }>,
  ): Array<{ type: string; text: string }> {
    return results.map((result) => ({
      type: 'text',
      text: `🔧 Optimizing ${this.getBasePath(result.file)}\n${result.stdout}\n${result.stderr}`,
    }));
  }

  async buildAndOptimize(params: {
    contractPath: string;
  }): Promise<OutputMessage[]> {
    try {
      const { contractPath = process.cwd() } = params;

      const command = this.getCommand('build', { path: contractPath });
      let { error, stdout, stderr } = await this.executeCommand(command);

      if (error) {
        this.handleCommandError(ErrorType.BUILD, { error, stdout, stderr });
      }

      const wasmDir = this.resolvePath(
        contractPath,
        'target/wasm32-unknown-unknown/release',
      );

      if (!this.exists(wasmDir)) {
        const messages = this.formatBuildOutput(
          stdout,
          stderr,
          contractPath,
        ) as OutputMessage[];

        messages.push({
          type: 'text',
          text: '❌ Error: No WASM directory found after build',
        });

        messages.push({
          type: 'text',
          text: '💡 Tip: Check if the build process completed successfully',
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
          type: 'text',
          text: '❌ No WASM files found to optimize',
        });

        messages.push({
          type: 'text',
          text: '💡 Tip: Check if the build process generated any WASM files',
        });

        return messages;
      }

      const optimizationResults = await Promise.all(
        wasmFiles.map((file) =>
          this.optimizeWasmFile(contractPath, file).catch((error) => ({
            file,
            stdout: '',
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
        type: 'text',
        text: `✨ Found ${optimizationResults.length} WASM file(s) to optimize`,
      });

      messages.push(
        ...(this.formatOptimizationResults(
          optimizationResults,
        ) as OutputMessage[]),
      );

      messages.push({
        type: 'text',
        text: optimizationResults.some((r) => r.stderr.includes('Error'))
          ? '⚠️ Build completed with optimization errors'
          : '✅ Build and optimization completed successfully!',
      });

      return messages;
    } catch (error) {
      console.error('Error in build and optimize process:', error);
      throw error;
    }
  }

  async deploy(params: IDeployContractArgs): Promise<OutputMessage[]> {
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
        type: 'text',
        text: `❌ Error in deploy process: ${error instanceof Error ? error.message : String(error)}`,
      });

      return errorMessage;
    }
  }

  async retrieveContractMethods(
    params: IGetContractMethodsArgs,
  ): Promise<OutputMessage[]> {
    try {
      const { contractAddress } = params;
      const messages = this.createInitialMessage(contractAddress);

      const contractInterface =
        await this.getContractInterface(contractAddress);

      messages.push({
        type: 'text',
        text: `Interface retrieved successfully`,
      });

      messages.push({
        type: 'text',
        text: `Contract Interface`,
      });

      messages.push({
        type: 'text',
        text: JSON.stringify(contractInterface, null, 2),
      });

      return messages;
    } catch (error) {
      console.error('Error in retrieve contract methods process:', error);
      throw error;
    }
  }

  private formatCommandArgs(args?: IInvokeContractMethodArgs[]): string[] {
    if (!args) return [];
    return args.map((arg) => `--${arg.name} ${arg.value}`);
  }

  private createInvokeCommand(params: IInvokeContractMethod): string {
    return this.getCommand('invoke', {
      contractAddress: params.contractAddress,
      method: params.method.name,
      args: this.formatCommandArgs(params.args),
      secretKey: params.secretKey,
      network: this.network,
    });
  }

  async invokeContractMethod(
    params: IInvokeContractMethod,
  ): Promise<OutputMessage[]> {
    try {
      const hasInvalidParams =
        this.validationService.validateInvokeParams(params);

      if (hasInvalidParams) {
        const errorMessages = [
          {
            type: 'text',
            text: '❌ Invalid parameters',
          },
          {
            type: 'text',
            text: JSON.stringify(hasInvalidParams, null, 2),
          },
        ] as OutputMessage[];

        return errorMessages;
      }

      const messages = this.createInitialMessage(params.contractAddress);
      const command = this.createInvokeCommand(params);

      messages.push({
        type: 'text',
        text: `🚀 Invoking contract method: ${params.method.name}`,
      });

      const executionResult = await this.executeCommand(command);

      const parsedResult = this.parseInvokeResult(
        await this.validateInvokeResult(executionResult),
      );

      messages.push({
        type: 'text',
        text: `🚀 Result: ${JSON.stringify(parsedResult, null, 2)}`,
      });

      return messages;
    } catch (error) {
      console.error('Error in invoke contract method process:', error);
      throw error;
    }
  }

  private async validateInvokeResult({
    error,
    stdout,
    stderr,
  }: ICommandResult): Promise<OutputMessage[]> {
    if (error) {
      console.error('Error executing command:', error);
      const messages = [
        ...this.formatStderrOutput(stderr),
        ...this.formatErrorOutput(stderr),
      ];
      return messages;
    }

    const formattedStdout = this.formatStdoutOutput(stdout);
    const formattedStderr = this.formatStderrOutput(stderr);

    const messages = [...formattedStdout, ...formattedStderr];

    return messages;
  }

  private parseInvokeResult(executionResult: OutputMessage[]): any {
    const result = executionResult.find((m) =>
      m.text.includes('Transaction successfully sent'),
    );

    if (!result) {
      return null;
    }

    return result;
  }

  private createInitialMessage(contractAddress: string): OutputMessage[] {
    return [
      {
        type: 'text',
        text: `🚀 Retrieving contract methods for address: ${contractAddress}`,
      },
    ];
  }

  private async getContractInterface(
    contractAddress: string,
  ): Promise<IContractInterface> {
    const command = this.getCommand('contractInterface', {
      contractId: contractAddress,
      network: this.network,
    });

    const { stdout } = await this.executeCommand(command);

    const parser = new ContractParser(stdout);
    const contractInterface = parser.getContractInterface();

    return contractInterface;
  }

  private createDeploymentMessages(): OutputMessage[] {
    return [
      {
        type: 'text',
        text: `🚀 Starting contract deployment...`,
      },
    ];
  }

  private async deployUsingStellarCLI({
    wasmPath,
    secretKey,
    constructorArgs,
  }: IDeployContractArgs): Promise<OutputMessage[]> {
    const command = this.getCommand('deploy', {
      wasmPath,
      secretKey,
      network: this.network,
      constructorArgs: constructorArgs
        ? this.resolveConstructorArgs(constructorArgs)
        : '',
    });

    const { error, stdout, stderr } = await this.executeCommand(command);

    if (error) {
      return this.formatErrorOutput(stderr);
    }

    const formattedStderr = this.formatStderrOutput(stderr);
    const formattedStdout = this.formatStdoutOutput(stdout);

    const messages = [
      ...formattedStderr,
      ...this.formatContractDeploymentMessage(formattedStdout),
    ];

    return messages;
  }

  private formatContractDeploymentMessage(
    messages: OutputMessage[],
  ): OutputMessage[] {
    const contractMessage = messages
      .filter((m) => m.text.length > 0)
      .find((message) => message.text.startsWith('C'));

    if (!contractMessage) {
      return messages;
    }

    const contractAddress = contractMessage.text;

    return [
      {
        type: 'text',
        text: `Contract deployed successfully at address: ${contractAddress}`,
      },
    ];
  }

  private async checkContractConstructorArgs(
    params: IDeployContractArgs,
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
  ): Promise<{ result: boolean; args: IConstructorArg[] }> {
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
  ): IConstructorArg[] {
    const srcDir =
      currentPath || this.resolvePath(contractPath, '../../../../');
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
  ): IConstructorArg[] {
    if (!fileName.endsWith('.rs')) {
      return [];
    }

    const content = this.readFile<string>(filePath);
    const constructorMatch = content.match(/pub fn __constructor\(([^)]+)\)/);
    if (!constructorMatch) {
      return [];
    }

    return this.parseConstructorArgs(constructorMatch[1]);
  }

  private parseConstructorArgs(args: string): IConstructorArg[] {
    return args
      .split(',')
      .slice(1)
      .map(this.parseArgument)
      .filter((arg): arg is IConstructorArg => arg !== null);
  }

  private parseArgument(arg: string): IConstructorArg | null {
    const [name, type] = arg
      .trim()
      .split(': ')
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
        directoryName === 'contracts')
    );
  }

  private resolveConstructorArgs(constructorArgs: IConstructorArg[]): string {
    return constructorArgs
      .map((arg) => `--${arg.name} ${arg.value}`)
      .join(', ');
  }

  private resolvePacakgeName(contractPath: string): string {
    return contractPath.split(/[/\\]/).pop()?.split('.')[0] || '';
  }

  private fromSnakeCaseToKebabCase(str: string): string {
    return str.replace(/_/g, '-');
  }
}
