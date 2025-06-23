import {
  IContractEnum,
  IContractField,
  IContractInterface,
  IContractMethod,
  IContractParameter,
  IContractStruct,
  Visibility,
} from '../../interfaces/soroban/ContractInterface.js';

const REGEX_PATTERNS = {
  METHOD: /fn\s+(\w+)\s*\((.*?)\)(?:\s*->\s*(.*?))?;/,
  STRUCT: /pub struct\s+(\w+)\s*{([^}]*)}/,
  ENUM: /pub enum\s+(\w+)\s*{([^}]*)}/,
  VARIANT: /(\w+)\((.*)\)/,
  SOROBAN_PREFIX: /soroban_sdk::/g,
} as const;

export class ContractParser {
  private contractName: string | null = null;
  private contractMethods: IContractMethod[] = [];
  private contractStructs: IContractStruct[] = [];
  private contractEnums: IContractEnum[] = [];

  private static readonly OPEN_BRACKETS = new Set(['<', '(']);
  private static readonly CLOSE_BRACKETS = new Set(['>', ')']);
  private static readonly COMMA = ',';

  constructor(protected readonly source: string) {
    this.parseSource(source);
  }

  public getContractName(): string | null {
    return this.contractName;
  }

  public getContractMethods(): IContractMethod[] {
    return this.contractMethods;
  }

  public getContractStructs(): IContractStruct[] {
    return this.contractStructs;
  }

  public getContractEnums(): IContractEnum[] {
    return this.contractEnums;
  }

  public getContractInterface(): IContractInterface {
    return {
      name: this.contractName as string,
      methods: this.contractMethods,
      structs: this.contractStructs,
      enums: this.contractEnums,
    };
  }

  protected parseSource(source: string) {
    const lines = source.split('\n').map((line) => line.trim());

    this.contractName = this.parseContractName(lines);
    this.contractMethods = this.parseContractMethods(lines);
    this.contractStructs = this.parseContractStructs(lines);
    this.contractEnums = this.parseContractEnums(lines);
  }

  private parseContractName(line: string[]): string {
    const contractNameLine = line.find((line) => line.startsWith('pub trait'));

    if (contractNameLine) {
      const contractName = contractNameLine
        .split('pub trait ')[1]
        .split(' {')[0];

      return contractName;
    }

    return 'DefaultContractName';
  }

  private parseContractMethods(lines: string[]): IContractMethod[] {
    return this.collectLines(lines, 'fn', ';', (methodLines) =>
      this.parseMethodLines(methodLines),
    );
  }

  private parseContractStructs(lines: string[]): IContractStruct[] {
    return this.collectLines(lines, 'pub struct', '}', (structLines) =>
      this.parseStructLines(structLines),
    );
  }

  private parseContractEnums(lines: string[]): IContractEnum[] {
    return this.collectLines(lines, 'pub enum', '}', (enumLines) =>
      this.parseEnumLines(enumLines),
    );
  }

  private parseMethodLines(lines: string[]): IContractMethod | null {
    const methodText = lines.join(' ');
    const methodMatch = methodText.match(REGEX_PATTERNS.METHOD);

    if (!methodMatch) {
      return null;
    }

    const [, name, paramsText, returnType] = methodMatch;
    const parameters = this.parseParameters(paramsText);

    return {
      name,
      parameters,
      returnType:
        returnType
          ?.split(REGEX_PATTERNS.SOROBAN_PREFIX)
          ?.join('')
          ?.split(', ')
          ?.filter((e) => e?.trim())
          ?.map((e) => e?.trim())
          ?.join(', ') || '()',
    };
  }

  private parseParameters(paramsText: string): IContractParameter[] {
    return this.parseCommaSeparatedItems(paramsText, (paramText) => {
      const [name, type] = paramText.split(':').map((s) => s.trim());
      if (name && type && type !== 'Env') {
        return { name, type };
      }
      return null;
    });
  }

  private parseStructLines(lines: string[]): IContractStruct | null {
    const structText = lines.join(' ');
    const structMatch = structText.match(REGEX_PATTERNS.STRUCT);

    if (!structMatch) {
      return null;
    }

    const [, name, fieldsText] = structMatch;
    const fields = this.parseStructFields(fieldsText);

    return {
      name,
      fields,
    };
  }

  private parseStructFields(fieldsText: string): IContractField[] {
    return this.parseCommaSeparatedItems(fieldsText, (fieldText) => {
      const [visibility, name, type] = this.parseField(fieldText);
      if (name && type) {
        return { name, type, visibility };
      }
      return null;
    });
  }

  private parseField(fieldText: string): [Visibility, string, string] {
    const [visibilityAndName, type] = fieldText.split(':').map((s) => s.trim());

    const visibility: Visibility = visibilityAndName.startsWith('pub')
      ? Visibility.Public
      : Visibility.Private;

    const name = visibilityAndName.replace(/^(pub|private)\s+/, '');

    return [visibility, name, type];
  }

  private parseEnumLines(lines: string[]): IContractEnum | null {
    const enumText = lines.join(' ');
    const enumMatch = enumText.match(REGEX_PATTERNS.ENUM);

    if (!enumMatch) {
      return null;
    }

    const [, name, variantsText] = enumMatch;
    const variants = this.parseEnumVariants(variantsText);
    const isError =
      enumText.includes('#[contracterror]') ||
      enumText.includes('#[soroban_sdk::contracterror');

    return { name, variants, isError };
  }

  private parseEnumVariants(
    variantsText: string,
  ): { name: string; value?: number; dataType?: string }[] {
    return this.parseCommaSeparatedItems(variantsText, (variantText) => {
      if (!variantText) {
        return null;
      }

      if (variantText.includes('=')) {
        const [name, value] = variantText.split('=').map((s) => s.trim());
        return {
          name,
          value: parseInt(value, 10),
        };
      }

      const match = variantText.match(REGEX_PATTERNS.VARIANT);
      if (match) {
        const [, name, dataType] = match;
        const cleanDataType = dataType
          .replace(REGEX_PATTERNS.SOROBAN_PREFIX, '')
          .trim();

        return {
          name,
          dataType: cleanDataType,
        };
      }

      return {
        name: variantText.trim(),
      };
    });
  }

  private collectLines<T>(
    lines: string[],
    startPattern: string,
    endPattern: string,
    parseLines: (lines: string[]) => T | null,
  ): T[] {
    const items: T[] = [];
    let collectedLines: string[] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith(startPattern)) {
        if (collectedLines) {
          const item = parseLines(collectedLines);
          if (item) {
            items.push(item);
          }
          collectedLines = [];
        }
        collectedLines = [line];
      } else if (collectedLines) {
        collectedLines.push(line);
        if (trimmed === endPattern) {
          const item = parseLines(collectedLines);
          if (item) {
            items.push(item);
          }
          collectedLines = null;
        }
      }
    }

    if (collectedLines) {
      const item = parseLines(collectedLines);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  private parseCommaSeparatedItems<T>(
    text: string,
    parseItem: (item: string) => T | null,
  ): T[] {
    const cleanText = text.replace(REGEX_PATTERNS.SOROBAN_PREFIX, '').trim();
    if (!cleanText) {
      return [];
    }

    const items: T[] = [];
    let currentItem = '';
    let bracketCount = 0;

    for (const char of cleanText) {
      if (ContractParser.OPEN_BRACKETS.has(char)) bracketCount++;
      else if (ContractParser.CLOSE_BRACKETS.has(char)) bracketCount--;

      if (char === ContractParser.COMMA && bracketCount === 0) {
        this.pushParsedItem(currentItem, parseItem, items);
        currentItem = '';
      } else {
        currentItem += char;
      }
    }

    this.pushParsedItem(currentItem, parseItem, items);
    return items;
  }

  private pushParsedItem<T>(
    raw: string,
    parseItem: (item: string) => T | null,
    items: T[],
  ) {
    const trimmed = raw.trim();

    if (!trimmed) return;

    const item = parseItem(trimmed);

    if (item) {
      items.push(item);
    }
  }
}
