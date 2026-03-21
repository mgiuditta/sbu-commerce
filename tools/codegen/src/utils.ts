/**
 * Helper functions for string transformations and type mappings.
 */

/**
 * Convert PascalCase or camelCase to kebab-case.
 * e.g. "ProductStatus" -> "product-status"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert to PascalCase.
 * e.g. "product_status" -> "ProductStatus", "product-status" -> "ProductStatus"
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

/**
 * Convert to camelCase.
 * e.g. "ProductStatus" -> "productStatus"
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Naive pluralization for field names.
 * Handles common English patterns: -y -> -ies, -s/-x/-ch/-sh -> -es, default +s.
 */
export function pluralize(str: string): string {
  if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
    return str.slice(0, -1) + 'ies';
  }
  if (/(?:s|x|ch|sh)$/i.test(str)) {
    return str + 'es';
  }
  return str + 's';
}

export interface TypeMapping {
  tsType: string;
  /** The column type argument, e.g. 'varchar' */
  columnType: string;
  /** Extra options to merge into the @Column options object, e.g. { precision: 10, scale: 2 } */
  columnOptions: Record<string, string | number | boolean>;
  validatorDecorators: string[];
  isRelation?: boolean;
}

const BUILTIN_TYPE_MAP: Record<string, TypeMapping> = {
  string: {
    tsType: 'string',
    columnType: `'varchar'`,
    columnOptions: {},
    validatorDecorators: ['@IsString()'],
  },
  text: {
    tsType: 'string',
    columnType: `'text'`,
    columnOptions: {},
    validatorDecorators: ['@IsString()'],
  },
  integer: {
    tsType: 'number',
    columnType: `'int'`,
    columnOptions: {},
    validatorDecorators: ['@IsNumber()'],
  },
  decimal: {
    tsType: 'number',
    columnType: `'decimal'`,
    columnOptions: { precision: 10, scale: 2 },
    validatorDecorators: ['@IsNumber()'],
  },
  boolean: {
    tsType: 'boolean',
    columnType: `'boolean'`,
    columnOptions: {},
    validatorDecorators: ['@IsBoolean()'],
  },
  datetime: {
    tsType: 'Date',
    columnType: `'timestamp'`,
    columnOptions: {},
    validatorDecorators: ['@IsDate()'],
  },
  DateTime: {
    tsType: 'Date',
    columnType: `'timestamp'`,
    columnOptions: {},
    validatorDecorators: ['@IsDate()'],
  },
  LocalizedString: {
    tsType: 'Record<string, string>',
    columnType: `'jsonb'`,
    columnOptions: {},
    validatorDecorators: ['@IsObject()'],
  },
  Media: {
    tsType: 'MediaReference',
    columnType: `'jsonb'`,
    columnOptions: {},
    validatorDecorators: ['@IsObject()'],
  },
  collection: {
    tsType: 'string[]',
    columnType: `'simple-array'`,
    columnOptions: {},
    validatorDecorators: ['@IsArray()'],
  },
  map: {
    tsType: 'Record<string, unknown>',
    columnType: `'jsonb'`,
    columnOptions: {},
    validatorDecorators: ['@IsObject()'],
  },
};

/**
 * Resolve a type string from items.json to TypeScript / TypeORM mappings.
 */
export function resolveType(
  typeName: string,
  enumCodes: Set<string>,
  itemtypeCodes: Set<string>,
): TypeMapping {
  // Check built-in types
  if (BUILTIN_TYPE_MAP[typeName]) {
    return BUILTIN_TYPE_MAP[typeName]!;
  }

  // Check if it's an enum
  if (enumCodes.has(typeName)) {
    return {
      tsType: typeName,
      columnType: '',
      columnOptions: {},
      validatorDecorators: [`@IsEnum(${typeName})`],
    };
  }

  // Check if it's a relation to another itemtype
  if (itemtypeCodes.has(typeName)) {
    return {
      tsType: typeName,
      columnType: '',
      columnOptions: {},
      validatorDecorators: ['@IsOptional()'],
      isRelation: true,
    };
  }

  // Unknown type — fail loud, never generate `any`
  throw new Error(
    `[sbu-codegen] Unknown type "${typeName}". ` +
    `Add it to BUILTIN_TYPE_MAP, enumtypes, or itemtypes in items.json.`,
  );
}

/**
 * Get the validator imports needed for a set of decorators.
 */
export function getValidatorImports(decorators: string[]): string[] {
  const importSet = new Set<string>();
  for (const d of decorators) {
    const match = d.match(/@(\w+)/);
    if (match) {
      importSet.add(match[1]!);
    }
  }
  return Array.from(importSet);
}
