export enum ValidationErrorType {
  MISSING_METHOD_PARAM = 'MISSING_METHOD_PARAM',
  EXTRA_METHOD_PARAM = 'EXTRA_METHOD_PARAM',
  INVALID_PARAM_TYPE = 'INVALID_PARAM_TYPE',
  MISSING_STRUCT_FIELD = 'MISSING_STRUCT_FIELD',
  EXTRA_STRUCT_FIELD = 'EXTRA_STRUCT_FIELD',
  INVALID_STRUCT_TYPE = 'INVALID_STRUCT_TYPE',
  MISSING_NESTED_STRUCT = 'MISSING_NESTED_STRUCT',
  STRUCT_NOT_FOUND = 'STRUCT_NOT_FOUND',
}

export enum ValidationContext {
  METHOD_PARAMETERS = 'method_parameters',
  STRUCT_TYPE = 'struct_type',
  STRUCT_DEFINITION = 'struct_definition',
  STRUCT_FIELDS = 'struct_fields',
  NESTED_STRUCT = 'nested_struct',
}

export type ValidationError = {
  type: ValidationErrorType;
  message: string;
  details: {
    paramName?: string;
    methodName?: string;
    structName?: string;
    fieldName?: string;
    expectedType?: string;
    providedType?: string;
    missingFields?: string[];
    extraFields?: string[];
    context: ValidationContext;
  };
};

export type Parameter = {
  name: string;
  type: string;
};
