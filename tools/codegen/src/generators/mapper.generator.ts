/**
 * Generate Mapper classes with static toDomain/toEntity methods.
 */
import type {
  ItemTypeDefinition,
  TypeRegistry,
  RelationDefinition,
} from '../types.js';
import { toKebabCase, toCamelCase, resolveType } from '../utils.js';

const HEADER = '// AUTO-GENERATED — DO NOT EDIT\n';

/**
 * Generate a Mapper class for an itemtype.
 */
export function generateMapper(
  itemtype: ItemTypeDefinition,
  registry: TypeRegistry,
): string {
  const lines: string[] = [HEADER];
  const enumCodes = new Set(registry.enums.keys());
  const itemtypeCodes = new Set(registry.itemtypes.keys());

  const modelFileName = `${toKebabCase(itemtype.code)}.model`;
  const entityFileName = `${toKebabCase(itemtype.code)}.entity`;

  lines.push(
    `import { ${itemtype.code} } from '../../../domain/models/${modelFileName}';`,
  );
  lines.push(
    `import { ${itemtype.code}Entity } from '../../../infrastructure/typeorm/${entityFileName}';`,
  );
  lines.push('');

  lines.push(`export class ${itemtype.code}Mapper {`);

  // toDomain method
  lines.push(`  static toDomain(entity: ${itemtype.code}Entity): ${itemtype.code} {`);
  lines.push(`    return new ${itemtype.code}({`);

  // Base fields if extends GenericItem
  if (itemtype.extends === 'GenericItem') {
    lines.push(`      id: entity.id,`);
    lines.push(`      pk: entity.pk,`);
    lines.push(`      createdAt: entity.createdAt,`);
    lines.push(`      updatedAt: entity.updatedAt,`);
  }

  // Attribute fields
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (mapping.isRelation) continue; // skip inline relation attributes for simple mapping
    lines.push(`      ${attr.name}: entity.${attr.name},`);
  }

  lines.push(`    });`);
  lines.push(`  }`);
  lines.push('');

  // toEntity method
  lines.push(`  static toEntity(domain: ${itemtype.code}): ${itemtype.code}Entity {`);
  lines.push(`    const entity = new ${itemtype.code}Entity();`);

  // Base fields
  if (itemtype.extends === 'GenericItem') {
    lines.push(`    if (domain.id) entity.id = domain.id;`);
  }

  // Attribute fields
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (mapping.isRelation) continue;
    lines.push(`    entity.${attr.name} = domain.${attr.name};`);
  }

  lines.push(`    return entity;`);
  lines.push(`  }`);

  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate barrel file for mappers.
 */
export function generateMapperBarrel(itemtypes: ItemTypeDefinition[]): string {
  const lines: string[] = [HEADER];

  for (const itemtype of itemtypes) {
    lines.push(
      `export { ${itemtype.code}Mapper } from './${toKebabCase(itemtype.code)}.mapper';`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
