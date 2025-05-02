export interface IConstructorArg {
  name: string;
  type: string;
  value?: string;
}

export interface IDeployContractArgs {
  wasmPath: string;
  secretKey: string;
  constructorArgs?: IConstructorArg[];
}
