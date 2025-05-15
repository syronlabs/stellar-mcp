import { IContractMethod, IContractParameter } from './ContractInterface';
import { IContractInterface } from './ContractInterface';

export interface IInvokeContractMethodArgs extends IContractParameter {
  value: string;
}

export interface IInvokeContractMethod
  extends Pick<IContractInterface, 'structs' | 'enums'> {
  contractAddress: string;
  method: IContractMethod;
  args?: IInvokeContractMethodArgs[];
  secretKey: string;
}
