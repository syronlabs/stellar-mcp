export interface ConstructorArg {
  name: string;
  type: string;
  value?: string;
}

export interface DeployContractArgs {
  wasmPath: string;
  secretKey: string;
  constructorArgs?: ConstructorArg[];
}
