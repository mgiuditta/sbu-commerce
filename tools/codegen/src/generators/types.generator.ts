/**
 * Generate TypeScript interfaces for packages/types/src/generated/.
 */
import type {
  ItemTypeDefinition,
  EnumTypeDefinition,
  TypeRegistry,
  RelationDefinition,
} from '../types.js';
import { toKebabCase, toCamelCase, pluralize, resolveType } from '../utils.js';

const HEADER = '// AUTO-GENERATED — DO NOT EDIT\n';

/**
 * Generate an interface for an itemtype (for packages/types).
 */
export function generateTypeInterface(
  itemtype: ItemTypeDefinition,
  registry: TypeRegistry,
): string {
  const lines: string[] = [HEADER];
  const enumCodes = new Set(registry.enums.keys());
  const itemtypeCodes = new Set(registry.itemtypes.keys());

  // Collect imports
  const enumImports = new Set<string>();
  const interfaceImports = new Set<string>();

  for (const attr of itemtype.attributes) {
    if (enumCodes.has(attr.type)) {
      enumImports.add(attr.type);
    }
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (mapping.isRelation) {
      interfaceImports.add(attr.type);
    }
  }

  // Relation imports
  const relationsForType = registry.relations.filter(
    (r) => r.source.type === itemtype.code || r.target.type === itemtype.code,
  );
  for (const rel of relationsForType) {
    const otherType =
      rel.source.type === itemtype.code ? rel.target.type : rel.source.type;
    if (otherType !== itemtype.code) {
      interfaceImports.add(otherType);
    }
  }

  // Enum imports
  if (enumImports.size > 0) {
    const sorted = Array.from(enumImports).sort();
    lines.push(`import { ${sorted.join(', ')} } from './enums';`);
  }

  // Interface imports
  for (const name of Array.from(interfaceImports).sort()) {
    lines.push(`import type { I${name} } from './${toKebabCase(name)}.interface';`);
  }

  if (enumImports.size > 0 || interfaceImports.size > 0) {
    lines.push('');
  }

  // Interface
  lines.push(`export interface I${itemtype.code} {`);

  // Base fields if extends GenericItem
  if (itemtype.extends === 'GenericItem') {
    lines.push(`  id: string;`);
    lines.push(`  pk: number;`);
    lines.push(`  createdAt: Date;`);
    lines.push(`  updatedAt: Date;`);
  }

  // Attribute fields
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    const isRequired = attr.required === true;
    const optional = isRequired ? '' : '?';

    if (mapping.isRelation) {
      lines.push(`  ${attr.name}${optional}: I${attr.type};`);
    } else {
      lines.push(`  ${attr.name}${optional}: ${mapping.tsType};`);
    }
  }

  // Relation fields
  for (const rel of relationsForType) {
    const isSource = rel.source.type === itemtype.code;
    const otherType = isSource ? rel.target.type : rel.source.type;
    const mySide = isSource ? rel.source : rel.target;
    const otherSide = isSource ? rel.target : rel.source;
    const fieldName = toCamelCase(otherType);

    if (
      (mySide.cardinality === 'many' && otherSide.cardinality === 'many') ||
      (mySide.cardinality === 'one' && otherSide.cardinality === 'many')
    ) {
      lines.push(`  ${pluralize(fieldName)}?: I${otherType}[];`);
    } else {
      lines.push(`  ${fieldName}?: I${otherType};`);
    }
  }

  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the barrel index.ts for packages/types/src/generated/.
 */
export function generateTypesBarrel(
  itemtypes: ItemTypeDefinition[],
  enumDefs: EnumTypeDefinition[],
): string {
  const lines: string[] = [HEADER];

  if (enumDefs.length > 0) {
    lines.push(`export * from './enums';`);
  }

  for (const itemtype of itemtypes) {
    lines.push(
      `export type { I${itemtype.code} } from './${toKebabCase(itemtype.code)}.interface';`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
