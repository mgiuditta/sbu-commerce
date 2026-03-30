/**
 * Codegen entry point — reads items.json and generates TypeORM entities,
 * domain models, mappers, DTOs, enums, and shared type interfaces.
 *
 * Supports multi-target: a single extension can generate code into
 * multiple services via `targetServices` in extension.json.
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  GenerateOptions,
  GeneratedFile,
  ParsedSource,
  ItemTypeDefinition,
  EnumTypeDefinition,
  TypeRegistry,
  ExtensionMeta,
  ResolvedTarget,
} from './types.js';
import { discoverItemsJsonFiles, buildTypeRegistry } from './parser.js';
import { resolveDependencies } from './dependency-resolver.js';
import { toKebabCase } from './utils.js';
import {
  generateEnum,
  generateEnumBarrel,
  generateGenericItemModel,
  generateDomainModel,
  generateDomainModelBarrel,
  generateGenericItemEntity,
  generateTypeOrmEntity,
  generateEntityBarrel,
  generateMapper,
  generateMapperBarrel,
  generateDtos,
  generateDtoBarrel,
  generateTypeInterface,
  generateTypesBarrel,
} from './generators/index.js';

/**
 * Directories (relative to a service/extension base dir) that contain generated files.
 * Each directory has a generated/ subfolder, ignored via a single rule in the root .gitignore.
 */
const GENERATED_DIRS = [
  join('src', 'domain', 'models', 'generated'),
  join('src', 'infrastructure', 'typeorm', 'generated'),
  join('src', 'adapters', 'outbound', 'persistence', 'generated'),
  join('src', 'adapters', 'inbound', 'rest', 'dto', 'generated'),
];

/**
 * Remove all generated files from services, extensions, and packages/types/src/generated.
 */
export async function cleanGenerated(options: GenerateOptions): Promise<void> {
  const { rootDir } = options;

  console.log('[sbu-codegen] Cleaning generated files...');

  const sources = discoverItemsJsonFiles(rootDir);
  const registry = buildTypeRegistry(sources);
  let removed = 0;

  // Collect unique base dirs (extensions may target multiple services)
  const baseDirs = new Set<string>();
  for (const source of sources) {
    const targets = resolveTargets(source, registry, rootDir);
    for (const target of targets) {
      baseDirs.add(target.baseDir);
    }
  }

  for (const baseDir of baseDirs) {
    for (const relDir of GENERATED_DIRS) {
      const dir = join(baseDir, relDir);
      removed += cleanDir(dir);
    }
  }

  // Clean shared types
  const sharedDir = join(rootDir, 'packages', 'types', 'src', 'generated');
  removed += cleanDir(sharedDir);

  console.log(`[sbu-codegen] Removed ${removed} generated files.`);
}

const AUTO_GENERATED_MARKER = '// AUTO-GENERATED';

/**
 * Remove only files with the AUTO-GENERATED marker in a directory.
 * Subdirectories whose contents are entirely generated (e.g. enums/) are removed recursively.
 * Hand-written files (adapters, etc.) are preserved.
 * Returns the number of files/dirs removed.
 */
function cleanDir(dir: string): number {
  if (!existsSync(dir)) return 0;

  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recurse into subdirectories (e.g. enums/)
      count += cleanDir(fullPath);
    } else {
      // Only delete files that start with the auto-generated marker
      const head = readHead(fullPath, 64);
      if (head !== null && head.includes(AUTO_GENERATED_MARKER)) {
        rmSync(fullPath, { force: true });
        count++;
      }
    }
  }

  return count;
}

/**
 * Read the first N bytes of a file. Returns null if the file cannot be read.
 */
function readHead(filePath: string, bytes: number): string | null {
  try {
    const fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(bytes);
    const bytesRead = readSync(fd, buf, 0, bytes, 0);
    closeSync(fd);
    return buf.toString('utf-8', 0, bytesRead);
  } catch {
    return null;
  }
}

/**
 * Main generate function. Scans items.json files, builds registry, generates code.
 */
export async function generate(options: GenerateOptions): Promise<void> {
  const { rootDir, extensions } = options;

  console.log(`[sbu-codegen] Scanning items.json files in ${rootDir}...`);

  // 1. Discover and parse all items.json files from extensions/
  const sources = discoverItemsJsonFiles(rootDir);
  console.log(`[sbu-codegen] Found ${sources.length} items.json files.`);

  // Filter by extension names if specified
  const filteredSources = extensions
    ? sources.filter((s) => extensions.includes(s.dirName))
    : sources;

  // 2. Build unified type registry (from ALL sources, for cross-reference resolution)
  const registry = buildTypeRegistry(sources);

  console.log(
    `[sbu-codegen] Registry: ${registry.enums.size} enums, ${registry.itemtypes.size} itemtypes, ${registry.relations.length} relations.`,
  );

  // 3. Resolve targets and generate
  const allFiles: GeneratedFile[] = [];

  for (const source of filteredSources) {
    const { schema } = source;
    if (
      schema.enumtypes.length === 0 &&
      schema.itemtypes.length === 0 &&
      schema.relations.length === 0
    ) {
      continue;
    }

    const targets = resolveTargets(source, registry, rootDir);
    for (const target of targets) {
      const files = generateForTarget(target, registry);
      allFiles.push(...files);
    }
  }

  // 4. Generate shared types for packages/types/src/generated/
  const sharedFiles = generateSharedTypes(registry, rootDir);
  allFiles.push(...sharedFiles);

  // 5. Write all files
  let written = 0;
  for (const file of allFiles) {
    ensureDir(file.filePath);
    writeFileSync(file.filePath, file.content, 'utf-8');
    written++;
  }

  console.log(`[sbu-codegen] Generated ${written} files.`);
}

/**
 * Read extension.json metadata from an extension directory.
 */
function readExtensionMeta(extensionDir: string): ExtensionMeta {
  const p = join(extensionDir, 'extension.json');
  if (!existsSync(p)) return { name: 'unknown', version: '0.0.0' };
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/**
 * Resolve generation targets for a source.
 *
 * - `targetServices` (multi-target): one ResolvedTarget per service,
 *   each with its direct itemtypes + transitive dependencies.
 * - `targetService` (legacy single): all itemtypes → one service.
 * - Neither: generate into the extension directory itself.
 */
function resolveTargets(
  source: ParsedSource,
  registry: TypeRegistry,
  rootDir: string,
): ResolvedTarget[] {
  const meta = readExtensionMeta(source.dirPath);

  // Case 1: multi-target
  if (meta.targetServices) {
    return Object.entries(meta.targetServices).map(
      ([serviceName, directCodes]) => {
        const allCodes = resolveDependencies(directCodes, registry);
        return buildResolvedTarget(serviceName, allCodes, registry, rootDir);
      },
    );
  }

  // Case 2: legacy single target
  if (meta.targetService) {
    const allCodes = (source.schema.itemtypes ?? []).map((it) => it.code);
    // Also resolve dependencies for single target (pulls in base types like GenericItem)
    const resolvedCodes = resolveDependencies(allCodes, registry);
    return [
      buildResolvedTarget(meta.targetService, resolvedCodes, registry, rootDir),
    ];
  }

  // Case 3: no target — generate into extension directory
  const allCodes = (source.schema.itemtypes ?? []).map((it) => it.code);
  return [
    buildResolvedTarget(null, allCodes, registry, rootDir, source.dirPath),
  ];
}

/**
 * Build a ResolvedTarget from a list of itemtype codes.
 */
function buildResolvedTarget(
  serviceName: string | null,
  itemtypeCodes: string[],
  registry: TypeRegistry,
  rootDir: string,
  fallbackDir?: string,
): ResolvedTarget {
  const baseDir = serviceName
    ? join(rootDir, 'services', serviceName)
    : fallbackDir!;

  const codeSet = new Set(itemtypeCodes);

  const itemtypes = itemtypeCodes
    .map((code) => registry.itemtypes.get(code))
    .filter(Boolean) as ItemTypeDefinition[];

  // Collect enums used by these itemtypes
  const enumCodes = new Set<string>();
  for (const it of itemtypes) {
    for (const attr of it.attributes) {
      if (registry.enums.has(attr.type)) {
        enumCodes.add(attr.type);
      }
    }
  }
  const enums = Array.from(enumCodes)
    .map((code) => registry.enums.get(code))
    .filter(Boolean) as EnumTypeDefinition[];

  // Filter relations: include only those where BOTH sides are in the itemtype set
  const relations = registry.relations.filter(
    (r) => codeSet.has(r.source.type) && codeSet.has(r.target.type),
  );

  return {
    serviceName: serviceName ?? 'local',
    baseDir,
    itemtypes,
    enums,
    relations,
    itemtypeCodes: codeSet,
  };
}

/**
 * Generate all files for a resolved target (a service or extension directory).
 */
function generateForTarget(
  target: ResolvedTarget,
  registry: TypeRegistry,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { baseDir, itemtypes, enums: enumDefs } = target;

  // Normalize itemtypes: default extends to GenericItem, exclude GenericItem itself
  // GenericItem is handled separately via the hasGenericItemExtender path
  const normalizedItemtypes = itemtypes
    .filter((it) => it.code !== 'GenericItem')
    .map((it) => ({
      ...it,
      extends: it.extends ?? 'GenericItem',
    }));

  const hasGenericItemExtender = normalizedItemtypes.some(
    (it) => it.extends === 'GenericItem',
  );

  // === Enums (shared between domain models and infrastructure) ===
  const enumsDir = join(baseDir, 'src', 'domain', 'models', 'generated', 'enums');
  if (enumDefs.length > 0) {
    for (const enumDef of enumDefs) {
      const fileName = `${toKebabCase(enumDef.code)}.enum.ts`;
      files.push({
        filePath: join(enumsDir, fileName),
        content: generateEnum(enumDef),
      });
    }

    files.push({
      filePath: join(enumsDir, 'index.ts'),
      content: generateEnumBarrel(enumDefs, (code) => `${toKebabCase(code)}.enum`),
    });
  } else {
    // Create empty enums barrel so imports don't break
    files.push({
      filePath: join(enumsDir, 'index.ts'),
      content: '// AUTO-GENERATED — DO NOT EDIT\n// No enums defined.\n',
    });
  }

  // === Domain Models ===
  if (normalizedItemtypes.length > 0) {
    const modelsDir = join(baseDir, 'src', 'domain', 'models', 'generated');

    if (hasGenericItemExtender) {
      files.push({
        filePath: join(modelsDir, 'generic-item.model.ts'),
        content: generateGenericItemModel(),
      });
    }

    for (const itemtype of normalizedItemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.model.ts`;
      files.push({
        filePath: join(modelsDir, fileName),
        content: generateDomainModel(itemtype, registry, target.itemtypeCodes),
      });
    }

    files.push({
      filePath: join(modelsDir, 'index.ts'),
      content: generateDomainModelBarrel(normalizedItemtypes, hasGenericItemExtender),
    });
  }

  // === TypeORM Entities ===
  if (normalizedItemtypes.length > 0) {
    const entitiesDir = join(baseDir, 'src', 'infrastructure', 'typeorm', 'generated');

    if (hasGenericItemExtender) {
      files.push({
        filePath: join(entitiesDir, 'generic-item.entity.ts'),
        content: generateGenericItemEntity(),
      });
    }

    for (const itemtype of normalizedItemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.entity.ts`;
      files.push({
        filePath: join(entitiesDir, fileName),
        content: generateTypeOrmEntity(itemtype, registry, target.itemtypeCodes),
      });
    }

    files.push({
      filePath: join(entitiesDir, 'index.ts'),
      content: generateEntityBarrel(normalizedItemtypes, hasGenericItemExtender),
    });
  }

  // === Mappers ===
  if (normalizedItemtypes.length > 0) {
    const mappersDir = join(
      baseDir,
      'src',
      'adapters',
      'outbound',
      'persistence',
      'generated',
    );

    for (const itemtype of normalizedItemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.mapper.ts`;
      files.push({
        filePath: join(mappersDir, fileName),
        content: generateMapper(itemtype, registry),
      });
    }

    files.push({
      filePath: join(mappersDir, 'index.ts'),
      content: generateMapperBarrel(normalizedItemtypes),
    });
  }

  // === DTOs ===
  if (normalizedItemtypes.length > 0) {
    const dtosDir = join(
      baseDir,
      'src',
      'adapters',
      'inbound',
      'rest',
      'dto',
      'generated',
    );

    for (const itemtype of normalizedItemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.dto.ts`;
      files.push({
        filePath: join(dtosDir, fileName),
        content: generateDtos(itemtype, registry),
      });
    }

    files.push({
      filePath: join(dtosDir, 'index.ts'),
      content: generateDtoBarrel(normalizedItemtypes),
    });
  }

  return files;
}

/**
 * Generate shared type interfaces for packages/types/src/generated/.
 */
function generateSharedTypes(
  registry: TypeRegistry,
  rootDir: string,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const generatedDir = join(rootDir, 'packages', 'types', 'src', 'generated');

  const allEnums = Array.from(registry.enums.values());
  const allItemtypes = Array.from(registry.itemtypes.values());

  if (allEnums.length === 0 && allItemtypes.length === 0) {
    return files;
  }

  // Enums
  if (allEnums.length > 0) {
    // All enums in a single file for shared types
    const enumLines: string[] = ['// AUTO-GENERATED — DO NOT EDIT\n'];
    for (const enumDef of allEnums) {
      enumLines.push(`export enum ${enumDef.code} {`);
      for (const value of enumDef.values) {
        enumLines.push(`  ${value} = '${value}',`);
      }
      enumLines.push('}');
      enumLines.push('');
    }

    files.push({
      filePath: join(generatedDir, 'enums.ts'),
      content: enumLines.join('\n'),
    });
  }

  // Interfaces
  for (const itemtype of allItemtypes) {
    const fileName = `${toKebabCase(itemtype.code)}.interface.ts`;
    files.push({
      filePath: join(generatedDir, fileName),
      content: generateTypeInterface(itemtype, registry),
    });
  }

  // Barrel
  files.push({
    filePath: join(generatedDir, 'index.ts'),
    content: generateTypesBarrel(allItemtypes, allEnums),
  });

  return files;
}

/**
 * Ensure directory exists for a file path.
 */
function ensureDir(filePath: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Re-export types for consumers
export type { GenerateOptions } from './types.js';
