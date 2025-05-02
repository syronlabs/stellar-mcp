export interface IContractMethod {
  name: string;
  parameters: IContractParameter[];
  returnType: string;
}

export interface IContractParameter {
  name: string;
  type: string;
}

export interface IContractStruct {
  name: string;
  fields: IContractField[];
}

export interface IContractField {
  name: string;
  type: string;
  visibility: 'pub' | 'private';
}

export interface IContractEnum {
  name: string;
  variants: {
    name: string;
    value?: number;
    dataType?: string;
  }[];
  isError?: boolean;
}

export interface IContractInterface {
  name: string;
  methods: IContractMethod[];
  structs: IContractStruct[];
  enums: IContractEnum[];
}
