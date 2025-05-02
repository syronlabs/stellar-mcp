import { Platform } from "../../interfaces/common.interface.js";
import {
  BuildCommandArgs,
  CommandArgsMap,
  CommandName,
  ContractInterfaceArgs,
  DeployCommandArgs,
  DirCommandArgs,
  FindCommandArgs,
  OptimizeCommandArgs,
} from "../../interfaces/soroban/Commands.js";
import { MessagesManager } from "./messages.js";

export class Core extends MessagesManager {
  protected linuxCommands: {
    [K in keyof CommandArgsMap]: (args: CommandArgsMap[K]) => string;
  } = {} as any;

  protected windowsCommands: {
    [K in keyof CommandArgsMap]: (args: CommandArgsMap[K]) => string;
  } = {} as any;

  constructor() {
    super();

    this.buildLinuxCommands();
    this.buildWindowsCommands();
  }

  protected getCommand<T extends CommandName>(
    command: T,
    args: CommandArgsMap[T],
  ): string {
    return this.platform === Platform.WINDOWS
      ? this.windowsCommands[command](args as any)
      : this.linuxCommands[command](args as any);
  }

  private buildLinuxCommands(): void {
    this.linuxCommands = {
      find: (args: FindCommandArgs) =>
        `find "${args.path}" -maxdepth 1 -name "${args.pattern}"`,
      dir: (args?: DirCommandArgs) => `ls ${args?.path || ""}`,
      build: (args: BuildCommandArgs) =>
        `cd ${args.path} && stellar contract build`,
      optimize: (args: OptimizeCommandArgs) =>
        `stellar contract optimize --wasm ${args.wasmPath}`,
      deploy: (args: DeployCommandArgs) =>
        `stellar contract deploy --wasm "${args.wasmPath}" --source "${args.secretKey}" --network ${args.network || "testnet"} ${args.constructorArgs?.length ? `-- ${args.constructorArgs}` : ""}`,
      contractInterface: (args: ContractInterfaceArgs) =>
        `stellar contract info interface --network ${args.network || "testnet"} --id ${args.contractId}`,
    };
  }

  private buildWindowsCommands(): void {
    this.windowsCommands = {
      find: (args: FindCommandArgs) => `dir /b "${args.path}\\${args.pattern}"`,
      dir: (args?: DirCommandArgs) => `dir ${args?.path || ""}`,
      build: (args: BuildCommandArgs) =>
        `cd ${args.path} && stellar contract build`,
      optimize: (args: OptimizeCommandArgs) =>
        `stellar contract optimize --wasm ${this.resolvePath(
          args.contractPath as string,
          args.wasmPath as string,
        )}`,
      deploy: (args: DeployCommandArgs) =>
        `stellar contract deploy --wasm "${args.wasmPath}" --source "${args.secretKey}" --network ${args.network || "testnet"} ${args.constructorArgs?.length ? `-- ${args.constructorArgs}` : ""}`,
      contractInterface: (args: ContractInterfaceArgs) =>
        `stellar contract info interface --network ${args.network || "testnet"} --id ${args.contractId}`,
    };
  }
}
