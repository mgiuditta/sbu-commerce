/**
 * Generate plain TypeScript domain model classes (NO decorators).
 */
import type {
  ItemTypeDefinition,
  TypeRegistry,
  RelationDefinition,
} from '../types.js';
import { toKebabCase, toCamelCase, pluralize, resolveType } from '../utils.js';

const HEADER = '// AUTO-GENERATED — DO NOT EDIT\n';

/**
 * Generate the GenericItem base domain model.
 */
export function generateGenericItemModel(): string {
  const lines: string[] = [HEADER];

  lines.push(`export class GenericItem {`);
  lines.push(`  id: string;`);
  lines.push(`  pk: number;`);
  lines.push(`  createdAt: Date;`);
  lines.push(`  updatedAt: Date;`);
  lines.push('');
  lines.push(`  constructor(partial?: Partial<GenericItem>) {`);
  lines.push(`    if (partial) {`);
  lines.push(`      Object.assign(this, partial);`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a domain model class for an itemtype.
 */
export function generateDomainModel(
  itemtype: ItemTypeDefinition,
  registry: TypeRegistry,
): string {
  const lines: string[] = [HEADER];
  const enumCodes = new Set(registry.enums.keys());
  const itemtypeCodes = new Set(registry.itemtypes.keys());

  // Collect imports
  const enumImports = new Set<string>();
  const modelImports = new Set<string>();

  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (enumCodes.has(attr.type)) {
      enumImports.add(attr.type);
    }
    if (mapping.isRelation) {
      modelImports.add(attr.type);
    }
  }

  // Add relation imports
  const relationsForType = getRelationsForType(itemtype.code, registry.relations);
  for (const rel of relationsForType) {
    const otherType = rel.source.type === itemtype.code ? rel.target.type : rel.source.type;
    if (otherType !== itemtype.code) {
      modelImports.add(otherType);
    }
  }

  // Import base class
  if (itemtype.extends === 'GenericItem') {
    lines.push(`import { GenericItem } from './generic-item.model';`);
  } else if (itemtype.extends) {
    lines.push(`import { ${itemtype.extends} } from './${toKebabCase(itemtype.extends)}.model';`);
  }

  // Import enums
  if (enumImports.size > 0) {
    const sorted = Array.from(enumImports).sort();
    lines.push(`import { ${sorted.join(', ')} } from './enums';`);
  }

  // Import related models
  for (const modelName of Array.from(modelImports).sort()) {
    lines.push(`import { ${modelName} } from './${toKebabCase(modelName)}.model';`);
  }

  if (enumImports.size > 0 || modelImports.size > 0 || itemtype.extends === 'GenericItem') {
    lines.push('');
  }

  // Class declaration
  const extendsClause = itemtype.extends ? ` extends ${itemtype.extends}` : '';
  lines.push(`export class ${itemtype.code}${extendsClause} {`);

  // Attribute fields
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    const isRequired = attr.required === true;
    const optional = isRequired ? '' : '?';
    lines.push(`  ${attr.name}${optional}: ${mapping.tsType};`);
  }

  // Relation fields
  for (const rel of relationsForType) {
    const field = getRelationField(itemtype.code, rel, registry);
    if (field) {
      lines.push(`  ${field}`);
    }
  }

  // Constructor
  lines.push('');
  lines.push(`  constructor(partial?: Partial<${itemtype.code}>) {`);
  if (itemtype.extends) {
    lines.push(`    super(partial);`);
  }
  lines.push(`    if (partial) {`);
  lines.push(`      Object.assign(this, partial);`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a barrel index.ts for domain models.
 */
export function generateDomainModelBarrel(
  itemtypes: ItemTypeDefinition[],
  hasGenericItem: boolean,
): string {
  const lines: string[] = [HEADER];

  if (hasGenericItem) {
    lines.push(`export { GenericItem } from './generic-item.model';`);
  }

  lines.push(`export * from './enums';`);

  for (const itemtype of itemtypes) {
    lines.push(
      `export { ${itemtype.code} } from './${toKebabCase(itemtype.code)}.model';`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

function getRelationsForType(
  typeName: string,
  relations: RelationDefinition[],
): RelationDefinition[] {
  return relations.filter(
    (r) => r.source.type === typeName || r.target.type === typeName,
  );
}

function getRelationField(
  typeName: string,
  rel: RelationDefinition,
  registry: TypeRegistry,
): string | null {
  const isSource = rel.source.type === typeName;
  const otherType = isSource ? rel.target.type : rel.source.type;
  const mySide = isSource ? rel.source : rel.target;
  const otherSide = isSource ? rel.target : rel.source;

  const fieldName = toCamelCase(otherType);

  const pluralFieldName = pluralize(fieldName);

  // many-to-many or one-to-many: array field
  if (otherSide.cardinality === 'many' && mySide.cardinality === 'many') {
    return `${pluralFieldName}?: ${otherType}[];`;
  }
  if (mySide.cardinality === 'one' && otherSide.cardinality === 'many') {
    // This side is "one", other is "many" — this side has the collection
    return `${pluralFieldName}?: ${otherType}[];`;
  }
  if (mySide.cardinality === 'many' && otherSide.cardinality === 'one') {
    // many-to-one: single reference
    return `${fieldName}?: ${otherType};`;
  }

  return `${fieldName}?: ${otherType};`;
}
