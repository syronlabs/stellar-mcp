import fs from 'fs';
import path from 'path';

import { ContractParser } from '../contractParser';

const readFixture = (filename: string): string => {
  const fixturePath = path.join(__dirname, 'fixture', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
};

describe('ContractParser', () => {
  describe('Contract Name Parsing', () => {
    it('Should parse the contract name from a real contract', () => {
      const source = readFixture('contract-output.txt');
      const parser = new ContractParser(source);
      expect(parser.getContractName()).toBe('Contract');
    });

    it('Should return DefaultContractName when no contract name is found', () => {
      const source = 'pub struct Something {';
      const parser = new ContractParser(source);
      expect(parser.getContractName()).toBe('DefaultContractName');
    });
  });

  describe('Method Parsing', () => {
    it('Should parse all methods from a real contract', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 17;
      const source = readFixture('contract-output.txt');
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();

      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);

      const expectedConstructorParameters = [
        { name: 'admin', type: 'Address' },
      ];

      const expectedFields = [
        {
          name: '__constructor',
          parameters: expect.arrayContaining(
            expectedConstructorParameters.map(expect.objectContaining),
          ),
          returnType: '()',
        },
      ];

      expect(methods[0]).toEqual(expect.objectContaining(expectedFields));
    });

    it('Should not include the env parameter in the methods', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 17;
      const source = readFixture('contract-output.txt');
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);

      const envMethod = methods.find((method) =>
        method.parameters.some((param) => param.type === 'Env'),
      );

      expect(envMethod).toBeUndefined();
    });

    it('Should parse a simple method with no parameters', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 1;
      const source = `
        pub trait MyContract {
          fn get_value(env: Env) -> u32;
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);

      const method = methods[0];

      expect(method.name).toBe('get_value');
      expect(method.parameters).toEqual([]);
      expect(method.returnType).toBe('u32');
    });

    it('Should parse a method with parameters', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 1;
      const source = `
        pub trait MyContract {
          fn set_value(env: Env, value: u32) -> ();
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);
      expect(methods[0]).toEqual({
        name: 'set_value',
        parameters: [{ name: 'value', type: 'u32' }],
        returnType: '()',
      });
    });

    it('Should parse a method with multiple parameters', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 1;
      const source = `
        pub trait MyContract {
          fn transfer(from: Address, to: Address, amount: u64) -> ();
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);

      const method = methods[0];

      expect(method.name).toBe('transfer');
      expect(method.parameters).toEqual([
        { name: 'from', type: 'Address' },
        { name: 'to', type: 'Address' },
        { name: 'amount', type: 'u64' },
      ]);
      expect(method.returnType).toBe('()');
    });

    it('Should handle multi-line method definitions', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 1;
      const source = `
        pub trait MyContract {
          fn complex_method(
            env: Env,
            param1: u32,
            param2: String,
            param3: Vec<u8>,
            param4: Map<Address, u64>
          ) -> Result<(), Error>;
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);

      const method = methods[0];

      expect(method.name).toBe('complex_method');

      const expectedParameters = [
        { name: 'param1', type: 'u32' },
        { name: 'param2', type: 'String' },
        { name: 'param3', type: 'Vec<u8>' },
        { name: 'param4', type: 'Map<Address, u64>' },
      ];

      expect(method.parameters).toEqual(
        expect.arrayContaining(expectedParameters.map(expect.objectContaining)),
      );
      expect(method.returnType).toBe('Result<(), Error>');
    });

    it('Should skip invalid method definitions', () => {
      const EXPECTED_AMOUNT_OF_METHODS = 1;
      const source = `
        pub trait MyContract {
          fn invalid_method(;
          fn valid_method(env: Env) -> u32;
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(EXPECTED_AMOUNT_OF_METHODS);
      expect(methods[0]).toEqual({
        name: 'valid_method',
        parameters: [],
        returnType: 'u32',
      });
    });
  });

  describe('Struct Parsing', () => {
    it('Should parse all structs from a real contract', () => {
      const EXPECTED_STRUCT_LENGTH = 4;
      const source = readFixture('contract-output.txt');
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();

      expect(structs).toHaveLength(EXPECTED_STRUCT_LENGTH);

      const dataStruct = structs[0];

      const expectedFields = [
        {
          name: 'admin',
          type: 'Address',
          visibility: 'pub',
        },
        {
          name: 'counter',
          type: 'u32',
          visibility: 'pub',
        },
        {
          name: 'message',
          type: 'String',
          visibility: 'pub',
        },
      ];

      expect(dataStruct).toEqual({
        name: 'Data',
        fields: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
      });
    });

    it('Should handle contracts without structs', () => {
      const EXPECTED_AMOUNT_OF_STRUCTS = 0;
      const source = readFixture('contract-without-structs.txt');
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();

      expect(structs).toHaveLength(EXPECTED_AMOUNT_OF_STRUCTS);
    });

    it('Should parse a simple struct', () => {
      const EXPECTED_AMOUNT_OF_STRUCTS = 1;
      const source = `
        pub struct User {
          pub name: String,
          pub age: u32,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(EXPECTED_AMOUNT_OF_STRUCTS);

      const expectedFields = [
        {
          name: 'name',
          type: 'String',
          visibility: 'pub',
        },
        {
          name: 'age',
          type: 'u32',
          visibility: 'pub',
        },
      ];

      expect(structs[0]).toEqual({
        name: 'User',
        fields: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
      });
    });

    it('Should parse a struct with private fields', () => {
      const EXPECTED_AMOUNT_OF_STRUCTS = 1;
      const source = `
        pub struct Account {
          pub address: Address,
          balance: u64,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(EXPECTED_AMOUNT_OF_STRUCTS);

      const expectedFields = [
        {
          name: 'address',
          type: 'Address',
          visibility: 'pub',
        },
      ];

      expect(structs[0]).toEqual({
        name: 'Account',
        fields: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
      });
    });

    it('Should parse struct definitions without commas', () => {
      const EXPECTED_AMOUNT_OF_STRUCTS = 2;
      const source = `
        pub struct StructWithoutCommas {
          pub field1: String
          pub field2: u32
        }
        pub struct StructWithCommas {
          field: u32,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(EXPECTED_AMOUNT_OF_STRUCTS);

      const expectedStructWithCommas = expect.objectContaining({
        name: 'StructWithCommas',
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: 'field',
            type: 'u32',
            visibility: 'private',
          }),
        ]),
      });

      const expectedStructWithoutCommas = expect.objectContaining({
        name: 'StructWithoutCommas',
        fields: expect.arrayContaining([]),
      });

      const expectedStructs = expect.arrayContaining([
        expectedStructWithCommas,
        expectedStructWithoutCommas,
      ]);

      expect(structs).toEqual(expectedStructs);
    });
  });

  describe('Enum Parsing', () => {
    it('Should parse all enums from a real contract', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 2;
      const source = readFixture('contract-output.txt');
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();

      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);

      const expectedDataKeyEnum = expect.objectContaining({
        name: 'DataKey',
        variants: expect.arrayContaining([
          expect.objectContaining({ name: 'Admin' }),
          expect.objectContaining({ name: 'Counter' }),
          expect.objectContaining({ name: 'Data' }),
        ]),
        isError: false,
      });

      const expectedContractErrorEnum = expect.objectContaining({
        name: 'ContractError',
        variants: expect.arrayContaining([
          expect.objectContaining({ name: 'AdminNotFound' }),
          expect.objectContaining({ name: 'InvalidValue' }),
          expect.objectContaining({ name: 'OptionNotFound' }),
        ]),
        isError: false,
      });

      const expectedEnums = expect.arrayContaining([
        expectedDataKeyEnum,
        expectedContractErrorEnum,
      ]);

      expect(enums).toEqual(expectedEnums);
    });

    it('Should handle contracts without enums', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 0;
      const source = readFixture('contract-without-enums.txt');
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);
    });

    it('Should parse a simple enum', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 1;
      const source = `
        pub enum Status {
          Active,
          Inactive,
          Pending,
        }
      `;
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);

      const expectedFields = [
        {
          name: 'Active',
        },
        {
          name: 'Inactive',
        },
        {
          name: 'Pending',
        },
      ];

      const expectedStatusEnum = expect.objectContaining({
        name: 'Status',
        variants: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
        isError: false,
      });

      expect(enums[0]).toEqual(expectedStatusEnum);
    });

    it('Should parse an enum with values', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 1;
      const source = `
        pub enum ErrorCode {
          NotFound = 404,
          Unauthorized = 401,
          InternalError = 500,
        }
      `;
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);

      const expectedFields = [
        {
          name: 'NotFound',
          value: 404,
        },
        {
          name: 'Unauthorized',
          value: 401,
        },
        {
          name: 'InternalError',
          value: 500,
        },
      ];
      const expectedErrorCodeEnum = expect.objectContaining({
        name: 'ErrorCode',
        variants: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
        isError: false,
      });

      expect(enums[0]).toEqual(expectedErrorCodeEnum);
    });

    it('Should parse an error enum', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 1;
      const source = `
        #[contracterror]
        pub enum ContractError {
          InvalidInput,
          InsufficientBalance,
          Unauthorized,
        }
      `;
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);

      const expectedFields = [
        {
          name: 'InvalidInput',
        },
        {
          name: 'InsufficientBalance',
        },
        {
          name: 'Unauthorized',
        },
      ];

      expect(enums[0]).toEqual({
        name: 'ContractError',
        variants: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
        isError: false,
      });
    });

    it('Should parse an enum with complex data types', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 1;
      const source = `
        pub enum Event {
          Transfer(Address, Address, u64),
          Approval((Address, Address, bool)),
        }
      `;

      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);

      const expectedFields = [
        {
          name: 'Transfer',
          dataType: 'Address, Address, u64',
        },
        {
          name: 'Approval',
          dataType: '(Address, Address, bool)',
        },
      ];

      const expectedEventEnum = expect.objectContaining({
        name: 'Event',
        variants: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
        isError: false,
      });

      expect(enums[0]).toEqual(expectedEventEnum);
    });

    it('Should skip invalid enum definitions', () => {
      const EXPECTED_AMOUNT_OF_ENUMS = 2;
      const source = `
        #[contracterror]
        pub enum InvalidEnum {
          Variant1,
          Variant2,
        }
        pub enum ValidEnum {
          Variant1,
          Variant2,
        }
      `;
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(EXPECTED_AMOUNT_OF_ENUMS);

      const expectedFields = [
        {
          name: 'Variant1',
        },
        {
          name: 'Variant2',
        },
      ];

      const expectedInvalidEnum = expect.objectContaining({
        name: 'InvalidEnum',
        variants: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
        isError: false,
      });

      const expectedValidEnum = expect.objectContaining({
        name: 'ValidEnum',
        variants: expect.arrayContaining(
          expectedFields.map(expect.objectContaining),
        ),
        isError: false,
      });

      const expectedEnums = expect.arrayContaining([
        expectedInvalidEnum,
        expectedValidEnum,
      ]);

      expect(enums).toEqual(expectedEnums);
    });
  });

  describe('Error Cases', () => {
    it('Should handle invalid field syntax gracefully', () => {
      const EXPECTED_AMOUNT_OF_STRUCTS = 0;
      const source =
        readFixture('contract-output.txt') +
        '\n' +
        `
        pub struct InvalidFields {
          field1 String,
          field2 u32,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(EXPECTED_AMOUNT_OF_STRUCTS);
    });
  });
});
