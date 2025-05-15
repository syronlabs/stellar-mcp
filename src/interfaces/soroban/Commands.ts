export interface IFindCommandArgs {
  path: string;
  pattern: string;
}

export interface IDirCommandArgs {
  path?: string;
}

export interface IBuildCommandArgs {
  path: string;
}

export interface IOptimizeCommandArgs {
  wasmPath: string;
  contractPath?: string;
}

export interface IDeployCommandArgs {
  wasmPath: string;
  secretKey: string;
  network?: string;
  constructorArgs?: string;
}

export interface IContractInterfaceArgs {
  contractId: string;
  network?: string;
}
export interface IInvokeCommandArgs {
  contractAddress: string;
  method: string;
  args: string[];
  secretKey: string;
  network?: string;
}

export type CommandArgsMap = {
  find: IFindCommandArgs;
  dir: IDirCommandArgs;
  build: IBuildCommandArgs;
  optimize: IOptimizeCommandArgs;
  deploy: IDeployCommandArgs;
  contractInterface: IContractInterfaceArgs;
  invoke: IInvokeCommandArgs;
};

export type CommandArgs =
  | IFindCommandArgs
  | IDirCommandArgs
  | IBuildCommandArgs
  | IOptimizeCommandArgs
  | IDeployCommandArgs
  | IContractInterfaceArgs
  | IInvokeCommandArgs;

export type CommandName =
  | 'find'
  | 'dir'
  | 'build'
  | 'optimize'
  | 'deploy'
  | 'contractInterface'
  | 'invoke';
