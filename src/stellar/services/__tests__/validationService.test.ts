import fs from 'fs';
import path from 'path';

import {
  ValidationContext,
  ValidationError,
  ValidationErrorType,
} from '../../../interfaces/services/validate.interface';
import {
  IContractInterface,
  IContractMethod,
} from '../../../interfaces/soroban/ContractInterface';
import {
  IInvokeContractMethod,
  IInvokeContractMethodArgs,
} from '../../../interfaces/soroban/InvokeContractMethod';
import { ContractParser } from '../../core/contractParser';
import { SorobanValidationService } from '../validation.service';

const readFixture = (filename: string, directory?: string): string => {
  const fixturePath = path.join(
    __dirname,
    directory || '',
    'fixture',
    filename,
  );

  return fs.readFileSync(fixturePath, 'utf-8');
};

function readContractInterface() {
  const source = readFixture('contract-output.txt', '../../core/__tests__');
  return new ContractParser(source).getContractInterface();
}

const createInvokeParams = (
  method: IContractMethod,
  args: IInvokeContractMethodArgs[] = [],
  contractInterface: IContractInterface,
): IInvokeContractMethod => ({
  structs: contractInterface.structs,
  enums: contractInterface.enums,
  contractAddress:
    'GJ666666666666666666666666666666666666666666666666666666666666666',
  method,
  args,
  secretKey:
    'SJ666666666666666666666666666666666666666666666666666666666666666',
});

const expectValidationError = (
  errors: ValidationError[] | null,
  expectedType: ValidationErrorType,
  expectedContext: ValidationContext,
  expectedDetails?: Partial<ValidationError['details']>,
) => {
  expect(errors).not.toBeNull();
  expect(errors).toHaveLength(1);
  expect(errors![0].type).toBe(expectedType);
  expect(errors![0].details.context).toBe(expectedContext);
  if (expectedDetails) {
    Object.entries(expectedDetails).forEach(([key, value]) => {
      expect(
        errors![0].details[key as keyof ValidationError['details']],
      ).toEqual(value);
    });
  }
};

describe('Validation Service', () => {
  let contractInterface: IContractInterface;
  let validationService: SorobanValidationService;

  beforeEach(() => {
    contractInterface = readContractInterface();
    validationService = new SorobanValidationService();
  });

  describe('Successful Validation Tests', () => {
    it('Should validate a simple method with no parameters', () => {
      const method: IContractMethod = {
        name: 'get_admin',
        parameters: [],
        returnType: 'Address',
      };

      const invokeParams = createInvokeParams(method, [], contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);
      expect(errors).toBeNull();
    });

    it('Should validate a method with primitive type parameters', () => {
      const method: IContractMethod = {
        name: 'method_with_args',
        parameters: [
          { name: 'arg1', type: 'u32' },
          { name: 'arg2', type: 'u32' },
        ],
        returnType: '(u32, u32)',
      };

      const args: IInvokeContractMethodArgs[] = [
        { name: 'arg1', type: 'u32', value: '42' },
        { name: 'arg2', type: 'u32', value: '24' },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);
      expect(errors).toBeNull();
    });

    it('Should validate a method with struct parameter', () => {
      const method: IContractMethod = {
        name: 'struct_as_arg',
        parameters: [
          {
            name: 'arg',
            type: 'Data',
          },
        ],
        returnType: 'Data',
      };

      const args: IInvokeContractMethodArgs[] = [
        {
          name: 'arg',
          type: 'Data',
          value: JSON.stringify({
            admin:
              'GJ666666666666666666666666666666666666666666666666666666666666666',
            counter: 42,
            message: 'test message',
          }),
        },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);
      expect(errors).toBeNull();
    });

    it('Should validate a method with optional parameters', () => {
      const method: IContractMethod = {
        name: 'handle_optionals',
        parameters: [
          { name: 'maybe_u32', type: 'Option<u32>' },
          { name: 'maybe_address', type: 'Option<Address>' },
        ],
        returnType: 'OptionalData',
      };

      const args: IInvokeContractMethodArgs[] = [
        { name: 'maybe_u32', type: 'Option<u32>', value: '42' },
        {
          name: 'maybe_address',
          type: 'Option<Address>',
          value:
            'GJ666666666666666666666666666666666666666666666666666666666666666',
        },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);
      expect(errors).toBeNull();
    });
  });

  describe('Validation Error Cases', () => {
    it('Should return error when number of arguments does not match parameters', () => {
      const method: IContractMethod = {
        name: 'method_with_args',
        parameters: [
          { name: 'arg1', type: 'u32' },
          { name: 'arg2', type: 'u32' },
        ],
        returnType: '(u32, u32)',
      };

      const args: IInvokeContractMethodArgs[] = [
        { name: 'arg1', type: 'u32', value: '42' },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);

      expectValidationError(
        errors,
        ValidationErrorType.MISSING_STRUCT_FIELD,
        ValidationContext.METHOD_PARAMETERS,
      );
    });

    it('Should return error when argument type does not match parameter type', () => {
      const method: IContractMethod = {
        name: 'method_with_args',
        parameters: [
          { name: 'arg1', type: 'u32' },
          { name: 'arg2', type: 'u32' },
        ],
        returnType: '(u32, u32)',
      };

      const args: IInvokeContractMethodArgs[] = [
        { name: 'arg1', type: 'u32', value: '1' },
        { name: 'arg2', type: 'u8', value: '24' },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);

      expectValidationError(
        errors,
        ValidationErrorType.INVALID_PARAM_TYPE,
        ValidationContext.METHOD_PARAMETERS,
        {
          paramName: 'arg2',
          expectedType: 'u32',
          providedType: 'u8',
        },
      );
    });

    it('Should return error when struct argument is missing required fields', () => {
      const method: IContractMethod = {
        name: 'struct_as_arg',
        parameters: [
          {
            name: 'arg',
            type: 'Data',
          },
        ],
        returnType: 'Data',
      };

      const args: IInvokeContractMethodArgs[] = [
        {
          name: 'arg',
          type: 'Data',
          value: JSON.stringify({
            admin:
              'GJ666666666666666666666666666666666666666666666666666666666666666',
          }),
        },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);

      expectValidationError(
        errors,
        ValidationErrorType.MISSING_STRUCT_FIELD,
        ValidationContext.STRUCT_FIELDS,
        {
          structName: 'Data',
          missingFields: ['counter', 'message'],
        },
      );
    });

    it('Should return error when optional argument has invalid type', () => {
      const method: IContractMethod = {
        name: 'handle_optionals',
        parameters: [
          { name: 'maybe_u32', type: 'Option<u32>' },
          { name: 'maybe_address', type: 'Option<Address>' },
        ],
        returnType: 'OptionalData',
      };

      const args: IInvokeContractMethodArgs[] = [
        { name: 'maybe_u32', type: 'Option<u8>', value: '1' },
        {
          name: 'maybe_address',
          type: 'Option<Address>',
          value: 'invalid_address',
        },
      ];

      const invokeParams = createInvokeParams(method, args, contractInterface);
      const errors = validationService.validateInvokeParams(invokeParams);

      expectValidationError(
        errors,
        ValidationErrorType.INVALID_PARAM_TYPE,
        ValidationContext.METHOD_PARAMETERS,
        {
          paramName: 'maybe_u32',
          expectedType: 'Option<u32>',
          providedType: 'Option<u8>',
        },
      );
    });
  });
});
