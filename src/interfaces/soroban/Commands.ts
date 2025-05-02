export interface FindCommandArgs {
  path: string;
  pattern: string;
}

export interface DirCommandArgs {
  path?: string;
}

export interface BuildCommandArgs {
  path: string;
}

export interface OptimizeCommandArgs {
  wasmPath: string;
  contractPath?: string;
}

export interface DeployCommandArgs {
  wasmPath: string;
  secretKey: string;
  network?: string;
  constructorArgs?: string;
}

export interface ContractInterfaceArgs {
  contractId: string;
  network?: string;
}

export type CommandArgsMap = {
  find: FindCommandArgs;
  dir: DirCommandArgs;
  build: BuildCommandArgs;
  optimize: OptimizeCommandArgs;
  deploy: DeployCommandArgs;
  contractInterface: ContractInterfaceArgs;
};

export type CommandArgs =
  | FindCommandArgs
  | DirCommandArgs
  | BuildCommandArgs
  | OptimizeCommandArgs
  | DeployCommandArgs
  | ContractInterfaceArgs;

export type CommandName =
  | "find"
  | "dir"
  | "build"
  | "optimize"
  | "deploy"
  | "contractInterface";
