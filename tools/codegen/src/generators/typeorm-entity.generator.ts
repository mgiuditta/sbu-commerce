/**
 * Generate TypeORM entity classes with decorators.
 */
import type {
  ItemTypeDefinition,
  TypeRegistry,
  RelationDefinition,
} from '../types.js';
import { toKebabCase, toCamelCase, pluralize, resolveType } from '../utils.js';

const HEADER = '// AUTO-GENERATED — DO NOT EDIT\n';

/**
 * Generate the GenericItemEntity base TypeORM entity.
 */
export function generateGenericItemEntity(): string {
  const lines: string[] = [HEADER];

  lines.push(
    `import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';`,
  );
  lines.push('');
  lines.push(`export abstract class GenericItemEntity {`);
  lines.push(`  @PrimaryGeneratedColumn('uuid')`);
  lines.push(`  id!: string;`);
  lines.push('');
  lines.push(`  @Column('int', { generated: 'increment' })`);
  lines.push(`  pk!: number;`);
  lines.push('');
  lines.push(`  @CreateDateColumn()`);
  lines.push(`  createdAt!: Date;`);
  lines.push('');
  lines.push(`  @UpdateDateColumn()`);
  lines.push(`  updatedAt!: Date;`);
  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a TypeORM entity class for an itemtype.
 */
export function generateTypeOrmEntity(
  itemtype: ItemTypeDefinition,
  registry: TypeRegistry,
): string {
  const lines: string[] = [HEADER];
  const enumCodes = new Set(registry.enums.keys());
  const itemtypeCodes = new Set(registry.itemtypes.keys());

  // Collect which TypeORM decorators we need
  const typeormDecorators = new Set<string>(['Entity', 'Column']);
  const enumImports = new Set<string>();
  const entityImports = new Set<string>(); // related entities

  if (itemtype.extends === 'GenericItem') {
    // We'll extend GenericItemEntity which has PrimaryGeneratedColumn etc.
  } else {
    typeormDecorators.add('PrimaryGeneratedColumn');
    typeormDecorators.add('CreateDateColumn');
    typeormDecorators.add('UpdateDateColumn');
  }

  // Analyze attributes for imports
  for (const attr of itemtype.attributes) {
    if (enumCodes.has(attr.type)) {
      enumImports.add(attr.type);
    }
  }

  // Analyze relations
  const relationsForType = getRelationsForType(itemtype.code, registry.relations);
  for (const rel of relationsForType) {
    const isSource = rel.source.type === itemtype.code;
    const mySide = isSource ? rel.source : rel.target;
    const otherSide = isSource ? rel.target : rel.source;
    const otherType = isSource ? rel.target.type : rel.source.type;

    entityImports.add(otherType);

    if (mySide.cardinality === 'many' && otherSide.cardinality === 'many') {
      typeormDecorators.add('ManyToMany');
      if (isSource) {
        typeormDecorators.add('JoinTable');
      }
    } else if (mySide.cardinality === 'many' && otherSide.cardinality === 'one') {
      typeormDecorators.add('ManyToOne');
    } else if (mySide.cardinality === 'one' && otherSide.cardinality === 'many') {
      typeormDecorators.add('OneToMany');
    } else {
      typeormDecorators.add('ManyToOne');
    }
  }

  // TypeORM imports
  lines.push(
    `import { ${Array.from(typeormDecorators).sort().join(', ')} } from 'typeorm';`,
  );

  // Base entity import
  if (itemtype.extends === 'GenericItem') {
    lines.push(`import { GenericItemEntity } from './generic-item.entity';`);
  }

  // Enum imports
  if (enumImports.size > 0) {
    const sorted = Array.from(enumImports).sort();
    lines.push(`import { ${sorted.join(', ')} } from '../../../domain/models/generated/enums';`);
  }

  // Related entity imports
  for (const entityName of Array.from(entityImports).sort()) {
    lines.push(
      `import { ${entityName}Entity } from './${toKebabCase(entityName)}.entity';`,
    );
  }

  lines.push('');

  // Entity decorator
  lines.push(`@Entity('${itemtype.table}')`);

  // Class declaration
  const extendsClause = itemtype.extends === 'GenericItem'
    ? ' extends GenericItemEntity'
    : '';
  lines.push(`export class ${itemtype.code}Entity${extendsClause} {`);

  // If not extending GenericItem, add base fields inline
  if (itemtype.extends !== 'GenericItem') {
    lines.push(`  @PrimaryGeneratedColumn('uuid')`);
    lines.push(`  id!: string;`);
    lines.push('');
    lines.push(`  @Column('int', { generated: 'increment' })`);
    lines.push(`  pk!: number;`);
    lines.push('');
    lines.push(`  @CreateDateColumn()`);
    lines.push(`  createdAt!: Date;`);
    lines.push('');
    lines.push(`  @UpdateDateColumn()`);
    lines.push(`  updatedAt!: Date;`);
    lines.push('');
  }

  // Attribute columns
  for (const attr of itemtype.attributes) {
    const mapping = resolveType(attr.type, enumCodes, itemtypeCodes);

    // Skip relation attributes — handled below
    if (mapping.isRelation) continue;

    const isRequired = attr.required === true;

    // Build column decorator
    if (enumCodes.has(attr.type)) {
      // Enum column — uses object-form @Column({ type: 'enum', enum: ... })
      const opts: string[] = [`type: 'enum'`, `enum: ${attr.type}`];
      if (attr.default !== undefined) {
        opts.push(`default: ${attr.type}.${attr.default}`);
      }
      if (!isRequired) {
        opts.push('nullable: true');
      }
      lines.push(`  @Column({ ${opts.join(', ')} })`);
    } else {
      // Regular column — merge base options with nullable/unique
      const extraOpts: Record<string, string | number | boolean> = {
        ...mapping.columnOptions,
      };
      if (!isRequired) extraOpts['nullable'] = true;
      if (attr.unique) extraOpts['unique'] = true;

      const hasOpts = Object.keys(extraOpts).length > 0;
      if (hasOpts) {
        const optsStr = Object.entries(extraOpts)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(', ');
        lines.push(`  @Column(${mapping.columnType}, { ${optsStr} })`);
      } else {
        lines.push(`  @Column(${mapping.columnType})`);
      }
    }

    lines.push(`  ${attr.name}!: ${mapping.tsType};`);
    lines.push('');
  }

  // Relation fields
  for (const rel of relationsForType) {
    const relLines = generateRelationField(itemtype.code, rel, registry);
    for (const line of relLines) {
      lines.push(line);
    }
  }

  lines.push(`}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate barrel file for TypeORM entities.
 */
export function generateEntityBarrel(
  itemtypes: ItemTypeDefinition[],
  hasGenericItem: boolean,
): string {
  const lines: string[] = [HEADER];

  if (hasGenericItem) {
    lines.push(`export { GenericItemEntity } from './generic-item.entity';`);
  }

  for (const itemtype of itemtypes) {
    lines.push(
      `export { ${itemtype.code}Entity } from './${toKebabCase(itemtype.code)}.entity';`,
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

function generateRelationField(
  typeName: string,
  rel: RelationDefinition,
  registry: TypeRegistry,
): string[] {
  const lines: string[] = [];
  const isSource = rel.source.type === typeName;
  const mySide = isSource ? rel.source : rel.target;
  const otherSide = isSource ? rel.target : rel.source;
  const otherType = isSource ? rel.target.type : rel.source.type;
  const fieldName = toCamelCase(otherType);
  const pluralFieldName = pluralize(fieldName);
  const otherEntityName = `${otherType}Entity`;
  const inverseFieldName = toCamelCase(typeName);
  const inversePluralFieldName = pluralize(inverseFieldName);

  if (mySide.cardinality === 'many' && otherSide.cardinality === 'many') {
    lines.push(
      `  @ManyToMany(() => ${otherEntityName}, (e) => e.${inversePluralFieldName})`,
    );
    if (isSource) {
      lines.push(`  @JoinTable()`);
    }
    lines.push(`  ${pluralFieldName}!: ${otherEntityName}[];`);
    lines.push('');
  } else if (mySide.cardinality === 'many' && otherSide.cardinality === 'one') {
    lines.push(
      `  @ManyToOne(() => ${otherEntityName}, (e) => e.${inversePluralFieldName})`,
    );
    lines.push(`  ${fieldName}!: ${otherEntityName};`);
    lines.push('');
  } else if (mySide.cardinality === 'one' && otherSide.cardinality === 'many') {
    lines.push(
      `  @OneToMany(() => ${otherEntityName}, (e) => e.${inverseFieldName})`,
    );
    lines.push(`  ${pluralFieldName}!: ${otherEntityName}[];`);
    lines.push('');
  } else {
    // one-to-one or fallback
    lines.push(
      `  @ManyToOne(() => ${otherEntityName})`,
    );
    lines.push(`  ${fieldName}!: ${otherEntityName};`);
    lines.push('');
  }

  return lines;
}
