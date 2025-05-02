import fs from "fs";
import path from "path";

import { ContractParser } from "../contractParser";

const readFixture = (filename: string): string => {
  const fixturePath = path.join(__dirname, "fixture", filename);
  return fs.readFileSync(fixturePath, "utf-8");
};

describe("ContractParser", () => {
  describe("Contract Name Parsing", () => {
    it("should parse the contract name from a real contract", () => {
      const source = readFixture("contract-output.txt");
      const parser = new ContractParser(source);
      expect(parser.getContractName()).toBe("Contract");
    });

    it("should return DefaultContractName when no contract name is found", () => {
      const source = "pub struct Something {";
      const parser = new ContractParser(source);
      expect(parser.getContractName()).toBe("DefaultContractName");
    });
  });

  describe("Method Parsing", () => {
    it("Should parse all methods from a real contract", () => {
      const source = readFixture("contract-output.txt");
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();

      expect(methods).toHaveLength(17);
      expect(methods[0]).toEqual({
        name: "__constructor",
        parameters: [
          { name: "env", type: "Env" },
          { name: "admin", type: "Address" },
        ],
        returnType: "()",
      });
    });

    it("Should parse a simple method with no parameters", () => {
      const source = `
        pub trait MyContract {
          fn get_value() -> u32;
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0]).toEqual({
        name: "get_value",
        parameters: [],
        returnType: "u32",
      });
    });

    it("Should parse a method with parameters", () => {
      const source = `
        pub trait MyContract {
          fn set_value(value: u32) -> ();
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0]).toEqual({
        name: "set_value",
        parameters: [{ name: "value", type: "u32" }],
        returnType: "()",
      });
    });

    it("Should parse a method with multiple parameters", () => {
      const source = `
        pub trait MyContract {
          fn transfer(from: Address, to: Address, amount: u64) -> ();
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0]).toEqual({
        name: "transfer",
        parameters: [
          { name: "from", type: "Address" },
          { name: "to", type: "Address" },
          { name: "amount", type: "u64" },
        ],
        returnType: "()",
      });
    });

    it("Should handle multi-line method definitions", () => {
      const source = `
        pub trait MyContract {
          fn complex_method(
            param1: u32,
            param2: String,
            param3: Vec<u8>,
            param4: Map<Address, u64>
          ) -> Result<(), Error>;
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0]).toEqual({
        name: "complex_method",
        parameters: expect.arrayContaining([
          expect.objectContaining({ name: "param1", type: "u32" }),
          expect.objectContaining({ name: "param2", type: "String" }),
          expect.objectContaining({ name: "param3", type: "Vec<u8>" }),
          expect.objectContaining({
            name: "param4",
            type: "Map<Address, u64>",
          }),
        ]),
        returnType: "Result<(), Error>",
      });
    });

    it("Should skip invalid method definitions", () => {
      const source = `
        pub trait MyContract {
          fn invalid_method(;
          fn valid_method() -> u32;
        }
      `;
      const parser = new ContractParser(source);
      const methods = parser.getContractMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0]).toEqual({
        name: "valid_method",
        parameters: [],
        returnType: "u32",
      });
    });
  });

  describe("Struct Parsing", () => {
    it("Should parse all structs from a real contract", () => {
      const source = readFixture("contract-output.txt");
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();

      expect(structs).toHaveLength(4);
      expect(structs[0]).toEqual({
        name: "Data",
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: "admin",
            type: "Address",
            visibility: "pub",
          }),
          expect.objectContaining({
            name: "counter",
            type: "u32",
            visibility: "pub",
          }),
          expect.objectContaining({
            name: "message",
            type: "String",
            visibility: "pub",
          }),
        ]),
      });
    });

    it("Should handle contracts without structs", () => {
      const source = readFixture("contract-without-structs.txt");
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(0);
    });

    it("Should parse a simple struct", () => {
      const source = `
        pub struct User {
          pub name: String,
          pub age: u32,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(1);
      expect(structs[0]).toEqual({
        name: "User",
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: "name",
            type: "String",
            visibility: "pub",
          }),
          expect.objectContaining({
            name: "age",
            type: "u32",
            visibility: "pub",
          }),
        ]),
      });
    });

    it("Should parse a struct with private fields", () => {
      const source = `
        pub struct Account {
          pub address: Address,
          balance: u64,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs).toHaveLength(1);
      expect(structs[0]).toEqual({
        name: "Account",
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: "address",
            type: "Address",
            visibility: "pub",
          }),
          expect.objectContaining({
            name: "balance",
            type: "u64",
            visibility: "private",
          }),
        ]),
      });
    });

    it("Should parse struct definitions without commas", () => {
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
      expect(structs).toHaveLength(2);

      const expectedStructWithCommas = expect.objectContaining({
        name: "StructWithCommas",
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: "field",
            type: "u32",
            visibility: "private",
          }),
        ]),
      });

      const expectedStructWithoutCommas = expect.objectContaining({
        name: "StructWithoutCommas",
        fields: expect.arrayContaining([]),
      });

      const expectedStructs = expect.arrayContaining([
        expectedStructWithCommas,
        expectedStructWithoutCommas,
      ]);

      expect(structs).toEqual(expectedStructs);
    });
  });

  describe("Enum Parsing", () => {
    it("Should parse all enums from a real contract", () => {
      const source = readFixture("contract-output.txt");
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();

      expect(enums).toHaveLength(2);

      const expectedDataKeyEnum = expect.objectContaining({
        name: "DataKey",
        variants: expect.arrayContaining([
          expect.objectContaining({ name: "Admin" }),
          expect.objectContaining({ name: "Counter" }),
          expect.objectContaining({ name: "Data" }),
        ]),
        isError: false,
      });

      const expectedContractErrorEnum = expect.objectContaining({
        name: "ContractError",
        variants: expect.arrayContaining([
          expect.objectContaining({ name: "AdminNotFound" }),
          expect.objectContaining({ name: "InvalidValue" }),
          expect.objectContaining({ name: "OptionNotFound" }),
        ]),
        isError: false,
      });

      const expectedEnums = expect.arrayContaining([
        expectedDataKeyEnum,
        expectedContractErrorEnum,
      ]);

      expect(enums).toEqual(expectedEnums);
    });

    it("Should handle contracts without enums", () => {
      const source = readFixture("contract-without-enums.txt");
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(0);
    });

    it("Should parse a simple enum", () => {
      const source = `
        pub enum Status {
          Active,
          Inactive,
          Pending,
        }
      `;
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(1);

      const expectedStatusEnum = expect.objectContaining({
        name: "Status",
        variants: expect.arrayContaining([
          expect.objectContaining({ name: "Active" }),
          expect.objectContaining({ name: "Inactive" }),
          expect.objectContaining({ name: "Pending" }),
        ]),
        isError: false,
      });

      expect(enums[0]).toEqual(expectedStatusEnum);
    });

    it("Should parse an enum with values", () => {
      const source = `
        pub enum ErrorCode {
          NotFound = 404,
          Unauthorized = 401,
          InternalError = 500,
        }
      `;
      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(1);

      const expectedErrorCodeEnum = expect.objectContaining({
        name: "ErrorCode",
        variants: expect.arrayContaining([
          expect.objectContaining({ name: "NotFound", value: 404 }),
          expect.objectContaining({ name: "Unauthorized", value: 401 }),
          expect.objectContaining({ name: "InternalError", value: 500 }),
        ]),
        isError: false,
      });

      expect(enums[0]).toEqual(expectedErrorCodeEnum);
    });

    it("Should parse an error enum", () => {
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
      expect(enums).toHaveLength(1);

      const expectedInvalidInputVariant = expect.objectContaining({
        name: "InvalidInput",
      });

      const expectedInsufficientBalanceVariant = expect.objectContaining({
        name: "InsufficientBalance",
      });

      const expectedUnauthorizedVariant = expect.objectContaining({
        name: "Unauthorized",
      });

      expect(enums[0]).toEqual({
        name: "ContractError",
        variants: [
          expectedInvalidInputVariant,
          expectedInsufficientBalanceVariant,
          expectedUnauthorizedVariant,
        ],
        isError: false,
      });
    });

    it("Should parse an enum with complex data types", () => {
      const source = `
        pub enum Event {
          Transfer(Address, Address, u64),
          Approval((Address, Address, bool)),
        }
      `;

      const parser = new ContractParser(source);
      const enums = parser.getContractEnums();
      expect(enums).toHaveLength(1);

      const expectedTransferVariant = expect.objectContaining({
        name: "Transfer",
        dataType: "Address, Address, u64",
      });

      const expectedApprovalVariant = expect.objectContaining({
        name: "Approval",
        dataType: "(Address, Address, bool)",
      });

      expect(enums[0]).toEqual({
        name: "Event",
        variants: [expectedTransferVariant, expectedApprovalVariant],
        isError: false,
      });
    });

    it("Should skip invalid enum definitions", () => {
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
      expect(enums).toHaveLength(2);

      const expectedInvalidEnum = expect.objectContaining({
        name: "InvalidEnum",
        variants: expect.arrayContaining([
          expect.objectContaining({ name: "Variant1" }),
          expect.objectContaining({ name: "Variant2" }),
        ]),
        isError: false,
      });

      const expectedValidEnum = expect.objectContaining({
        name: "ValidEnum",
        variants: expect.arrayContaining([
          expect.objectContaining({ name: "Variant1" }),
          expect.objectContaining({ name: "Variant2" }),
        ]),
        isError: false,
      });

      const expectedEnums = expect.arrayContaining([
        expectedInvalidEnum,
        expectedValidEnum,
      ]);

      expect(enums).toEqual(expectedEnums);
    });
  });

  describe("Error Cases", () => {
    it("Should handle invalid field syntax gracefully", () => {
      const source =
        readFixture("contract-output.txt") +
        "\n" +
        `
        pub struct InvalidFields {
          field1 String,
          field2 u32,
        }
      `;
      const parser = new ContractParser(source);
      const structs = parser.getContractStructs();
      expect(structs.length).toBeGreaterThan(0);
    });
  });
});
