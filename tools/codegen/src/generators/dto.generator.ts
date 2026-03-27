/**
 * Generate Create/Update DTO classes with class-validator decorators.
 */
import type {
  ItemTypeDefinition,
  TypeRegistry,
  AttributeDefinition,
} from '../types.js';
import { toKebabCase, resolveType, getValidatorImports } from '../utils.js';

const HEADER = '// AUTO-GENERATED — DO NOT EDIT\n';

/**
 * Generate Create and Update DTOs for an itemtype.
 */
export function generateDtos(
  itemtype: ItemTypeDefinition,
  registry: TypeRegistry,
): string {
  const lines: string[] = [HEADER];
  const enumCodes = new Set(registry.enums.keys());
  const itemtypeCodes = new Set(registry.itemtypes.keys());

  // Collect all validator decorators needed
  const allDecorators = new Set<string>();
  const enumImports = new Set<string>();

  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (mapping.isRelation) continue; // skip relation attrs in DTOs

    for (const dec of mapping.validatorDecorators) {
      const match = dec.match(/@(\w+)/);
      if (match) allDecorators.add(match[1]!);
    }
    allDecorators.add('IsNotEmpty');
    allDecorators.add('IsOptional');

    if (enumCodes.has(attr.type)) {
      enumImports.add(attr.type);
    }
  }

  // Import class-validator
  const sortedDecorators = Array.from(allDecorators).sort();
  lines.push(
    `import { ${sortedDecorators.join(', ')} } from 'class-validator';`,
  );

  // Import enums
  if (enumImports.size > 0) {
    const sorted = Array.from(enumImports).sort();
    lines.push(
      `import { ${sorted.join(', ')} } from '../../../../../domain/models/generated/enums';`,
    );
  }

  lines.push('');

  // CreateDto
  lines.push(`export class Create${itemtype.code}Dto {`);
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (mapping.isRelation) continue;

    const isRequired = attr.required === true;

    for (const dec of mapping.validatorDecorators) {
      lines.push(`  ${dec}`);
    }

    if (isRequired) {
      lines.push(`  @IsNotEmpty()`);
    } else {
      lines.push(`  @IsOptional()`);
    }

    const optional = isRequired ? '' : '?';
    lines.push(`  ${attr.name}${optional}: ${mapping.tsType};`);
    lines.push('');
  }
  lines.push(`}`);
  lines.push('');

  // UpdateDto — all fields optional
  lines.push(`export class Update${itemtype.code}Dto {`);
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);
    if (mapping.isRelation) continue;

    for (const dec of mapping.validatorDecorators) {
      lines.push(`  ${dec}`);
    }
    lines.push(`  @IsOptional()`);
    lines.push(`  ${attr.name}?: ${mapping.tsType};`);
    lines.push('');
  }
  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate barrel file for DTOs.
 */
export function generateDtoBarrel(itemtypes: ItemTypeDefinition[]): string {
  const lines: string[] = [HEADER];

  for (const itemtype of itemtypes) {
    lines.push(
      `export { Create${itemtype.code}Dto, Update${itemtype.code}Dto } from './${toKebabCase(itemtype.code)}.dto';`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
