export interface ContractMethod {
  name: string;
  parameters: ContractParameter[];
  returnType: string;
}

export interface ContractParameter {
  name: string;
  type: string;
}

export interface ContractStruct {
  name: string;
  fields: ContractField[];
}

export interface ContractField {
  name: string;
  type: string;
  visibility: "pub" | "private";
}

export interface ContractEnum {
  name: string;
  variants: {
    name: string;
    value?: number;
    dataType?: string;
  }[];
  isError?: boolean;
}

export interface ContractInterface {
  name: string;
  methods: ContractMethod[];
  structs: ContractStruct[];
  enums: ContractEnum[];
}
