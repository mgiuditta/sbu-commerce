// TypeScript interfaces for items.json schema

export interface ItemsJsonSchema {
  $schema?: string;
  extension: string;
  enumtypes: EnumTypeDefinition[];
  itemtypes: ItemTypeDefinition[];
  relations: RelationDefinition[];
  /**
   * Extend existing itemtypes defined by platform extensions or services.
   * Adds new attributes/relations without redefining the entire type.
   */
  itemtypeExtensions?: ItemTypeExtension[];
}

export interface EnumTypeDefinition {
  code: string;
  values: string[];
}

export interface AttributeDefinition {
  name: string;
  type: string;
  unique?: boolean;
  required?: boolean;
  default?: string | number | boolean;
}

export interface ItemTypeDefinition {
  code: string;
  extends?: string;
  table: string;
  attributes: AttributeDefinition[];
}

export interface RelationSide {
  type: string;
  cardinality: 'one' | 'many';
}

export interface RelationDefinition {
  code: string;
  source: RelationSide;
  target: RelationSide;
}

/**
 * Extend an existing itemtype with additional attributes.
 * The itemtype must already be defined in a platform extension or service.
 */
export interface ItemTypeExtension {
  /** Code of the itemtype to extend (must exist in registry) */
  code: string;
  /** Additional attributes to add */
  attributes?: AttributeDefinition[];
}

export interface TypeRegistry {
  enums: Map<string, EnumTypeDefinition>;
  itemtypes: Map<string, ItemTypeDefinition>;
  relations: RelationDefinition[];
  /** Maps itemtype code to the extension (service/extension) that owns it */
  ownership: Map<string, string>;
}

export interface GenerateOptions {
  rootDir: string;
  services?: string[];
}

export interface ParsedSource {
  filePath: string;
  dirPath: string;
  dirName: string;
  sourceType: 'service' | 'extension' | 'custom';
  schema: ItemsJsonSchema;
}

export interface GeneratedFile {
  filePath: string;
  content: string;
}
