import { Platform } from "../../interfaces/common.interface.js";
import { MessagesManager } from "./messages.js";

export class Core extends MessagesManager {
  protected linuxCommands: {
    [key: string]: (args?: Record<string, string>) => string;
  } = {};

  protected windowsCommands: {
    [key: string]: (args?: Record<string, string>) => string;
  } = {};

  constructor() {
    super();

    this.buildLinuxCommands();
    this.buildWindowsCommands();
  }

  protected getCommand(command: string, args?: Record<string, string>): string {
    return this.platform === Platform.WINDOWS
      ? this.windowsCommands[command](args)
      : this.linuxCommands[command](args);
  }

  private buildLinuxCommands(): void {
    this.linuxCommands = {
      find: (args) =>
        `find "${args?.path}" -maxdepth 1 -name "${args?.pattern}"`,
      dir: (args) => `ls ${args?.path || ""}`,
      build: (args) => `cd ${args?.path} && stellar contract build`,
      optimize: (args) =>
        `stellar contract optimize --wasm ${args?.wasmPath}`,
      deploy: (args) =>
        `stellar contract deploy --wasm "${args?.wasmPath}" --source "${args?.secretKey}" --network ${args?.network || "testnet"} ${args?.constructorArgs?.length ? `-- ${args.constructorArgs}` : ""}`,
    };
  }

  private buildWindowsCommands(): void {
    this.windowsCommands = {
      find: (args) => `dir /b "${args?.path}\\${args?.pattern}"`,
      dir: (args) => `dir ${args?.path || ""}`,
      build: (args) => `cd ${args?.path} && stellar contract build`,
      optimize: (args) =>
        `stellar contract optimize --wasm ${this.resolvePath(
          args?.contractPath as string,
          args?.wasmPath as string,
        )}`,
      deploy: (args) =>
        `stellar contract deploy --wasm "${args?.wasmPath}" --source "${args?.secretKey}" --network ${args?.network || "testnet"} ${args?.constructorArgs?.length ? `-- ${args.constructorArgs}` : ""}`,
    };
  }
}
