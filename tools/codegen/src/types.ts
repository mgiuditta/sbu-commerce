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
  attribute?: string;
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
  /** Maps itemtype code to the extension that owns it */
  ownership: Map<string, string>;
}

export interface GenerateOptions {
  rootDir: string;
  /** Filter by extension directory names (e.g. ["catalog", "core"]) */
  extensions?: string[];
}

/**
 * Metadata from extension.json.
 */
export interface ExtensionMeta {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  /** Single-service target (legacy, backward compat) */
  targetService?: string;
  /** Multi-service target: maps service names to explicit itemtype codes */
  targetServices?: Record<string, string[]>;
}

/**
 * A resolved generation target — one service (or extension fallback)
 * with all itemtypes, enums, and relations it needs.
 */
export interface ResolvedTarget {
  /** Service name or 'local' for extension-local generation */
  serviceName: string;
  /** Absolute base directory for generated output */
  baseDir: string;
  /** All itemtype definitions (direct + transitive dependencies) */
  itemtypes: ItemTypeDefinition[];
  /** All enum definitions used by the itemtypes */
  enums: EnumTypeDefinition[];
  /** Relations where both sides are in the itemtype set */
  relations: RelationDefinition[];
  /** Set of itemtype codes for quick lookup */
  itemtypeCodes: Set<string>;
}

export interface ParsedSource {
  filePath: string;
  dirPath: string;
  dirName: string;
  sourceType: 'extension' | 'custom';
  schema: ItemsJsonSchema;
}

export interface GeneratedFile {
  filePath: string;
  content: string;
}
