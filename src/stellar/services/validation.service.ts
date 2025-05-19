import {
  Parameter,
  ValidationContext,
  ValidationError,
  ValidationErrorType,
} from '../../interfaces/services/validate.interface.js';
import { IContractStruct } from '../../interfaces/soroban/ContractInterface.js';
import {
  IInvokeContractMethod,
  IInvokeContractMethodArgs,
} from '../../interfaces/soroban/InvokeContractMethod.js';

export class SorobanValidationService {
  private createValidationError(
    type: ValidationErrorType,
    message: string,
    details: Omit<ValidationError['details'], 'context'> & {
      context: ValidationContext;
    },
  ): ValidationError {
    return { type, message, details };
  }

  private validateParameterType(
    methodName: string,
    param: Parameter,
    arg: Parameter,
  ): ValidationError | null {
    if (arg.type !== param.type) {
      return this.createValidationError(
        ValidationErrorType.INVALID_PARAM_TYPE,
        `Parameter ${arg.name} in method ${methodName} has invalid type. Expected ${param.type}, got ${arg.type}`,
        {
          methodName,
          paramName: arg.name,
          expectedType: param.type,
          providedType: arg.type,
          context: ValidationContext.METHOD_PARAMETERS,
        },
      );
    }
    return null;
  }

  private validateParameterPresence(
    context: ValidationContext,
    name: string,
    expectedNames: string[],
    providedNames: string[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const missing = expectedNames.filter(
      (name) => !providedNames.includes(name),
    );
    const extra = providedNames.filter((name) => !expectedNames.includes(name));

    if (missing.length) {
      errors.push(
        this.createValidationError(
          ValidationErrorType.MISSING_STRUCT_FIELD,
          `Struct ${name} is missing required fields: ${missing.join(', ')}`,
          {
            structName: name,
            missingFields: missing,
            context,
          },
        ),
      );
    }

    if (extra.length) {
      errors.push(
        this.createValidationError(
          ValidationErrorType.EXTRA_STRUCT_FIELD,
          `Struct ${name} has extra fields: ${extra.join(', ')}`,
          {
            structName: name,
            extraFields: extra,
            context,
          },
        ),
      );
    }

    return errors;
  }

  private validateStructType(
    structs: IContractStruct[],
    arg: IInvokeContractMethodArgs,
    expectedType: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (arg.type !== expectedType) {
      errors.push(
        this.createValidationError(
          ValidationErrorType.INVALID_STRUCT_TYPE,
          `Argument ${arg.name} has invalid struct type. Expected ${expectedType}, got ${arg.type}`,
          {
            paramName: arg.name,
            structName: expectedType,
            expectedType,
            providedType: arg.type,
            context: ValidationContext.STRUCT_TYPE,
          },
        ),
      );
      return errors;
    }

    const struct = structs.find((s) => s.name === expectedType);
    if (!struct) {
      errors.push(
        this.createValidationError(
          ValidationErrorType.STRUCT_NOT_FOUND,
          `Struct type ${expectedType} not found in contract`,
          {
            structName: expectedType,
            context: ValidationContext.STRUCT_DEFINITION,
          },
        ),
      );
      return errors;
    }

    const providedFields = Object.keys(JSON.parse(arg.value || '{}'));
    const fieldErrors = this.validateParameterPresence(
      ValidationContext.STRUCT_FIELDS,
      expectedType,
      struct.fields.map((f) => f.name),
      providedFields,
    );

    if (fieldErrors.length) {
      errors.push(...fieldErrors);
    }

    for (const field of struct.fields) {
      if (structs.some((s) => s.name === field.type)) {
        const fieldValue = JSON.parse(arg.value || '{}')[field.name];
        if (!fieldValue) {
          errors.push(
            this.createValidationError(
              ValidationErrorType.MISSING_NESTED_STRUCT,
              `Struct ${expectedType} is missing nested struct ${field.name} of type ${field.type}`,
              {
                structName: expectedType,
                fieldName: field.name,
                expectedType: field.type,
                context: ValidationContext.NESTED_STRUCT,
              },
            ),
          );
        } else {
          const nestedErrors = this.validateStructType(
            structs,
            {
              name: field.name,
              type: field.type,
              value: JSON.stringify(fieldValue),
            },
            field.type,
          );
          errors.push(
            ...nestedErrors.map((error) => ({
              ...error,
              details: {
                ...error.details,
                context: ValidationContext.NESTED_STRUCT,
              },
            })),
          );
        }
      }
    }

    return errors;
  }

  private validateItems<T>(
    items: T[],
    validator: (item: T) => ValidationError[] | null,
    errorCollector: (errors: ValidationError[]) => void,
  ): void {
    for (const item of items) {
      const result = validator(item);
      if (result) {
        errorCollector(result);
      }
    }
  }

  validateInvokeParams({
    method,
    args,
    structs,
  }: IInvokeContractMethod): ValidationError[] | null {
    if (!args) return null;

    const errors: ValidationError[] = [];

    const methodErrors = this.validateParameterPresence(
      ValidationContext.METHOD_PARAMETERS,
      method.name,
      method.parameters.map((p) => p.name),
      args.map((a) => a.name),
    );
    errors.push(...methodErrors);

    this.validateItems(
      method.parameters,
      (param) => {
        const arg = args.find((a) => a.name === param.name);
        const typeError = arg
          ? this.validateParameterType(method.name, param, arg)
          : null;
        return typeError ? [typeError] : null;
      },
      (newErrors) => errors.push(...newErrors),
    );

    this.validateItems(
      args,
      (arg) => {
        const structType = structs.find((s) => s.name === arg.type);
        return structType
          ? this.validateStructType(structs, arg, arg.type)
          : null;
      },
      (newErrors) => errors.push(...newErrors),
    );

    return errors.length ? errors : null;
  }
}
