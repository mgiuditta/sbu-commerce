/**
 * Codegen entry point — reads items.json and generates TypeORM entities,
 * domain models, mappers, DTOs, enums, and shared type interfaces.
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
} from './types.js';
import { discoverItemsJsonFiles, buildTypeRegistry } from './parser.js';
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
 * Each directory uses a .gitignore that ignores everything except itself.
 */
const GENERATED_DIRS = [
  join('src', 'domain', 'models'),
  join('src', 'infrastructure', 'typeorm'),
  join('src', 'adapters', 'outbound', 'persistence'),
  join('src', 'adapters', 'inbound', 'rest', 'dto'),
];

/**
 * Remove all generated files from services, extensions, and packages/types/src/generated.
 */
export async function cleanGenerated(options: GenerateOptions): Promise<void> {
  const { rootDir } = options;

  console.log('[sbu-codegen] Cleaning generated files...');

  const sources = discoverItemsJsonFiles(rootDir);
  let removed = 0;

  // Collect unique base dirs (extensions may target the same service)
  const baseDirs = new Set<string>();
  for (const source of sources) {
    baseDirs.add(resolveBaseDir(source.dirPath, rootDir));
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
    if (entry.name === '.gitignore' || entry.name === '.gitkeep') continue;

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

  // 3. Determine which sources have content to generate
  const sourcesWithContent = filteredSources.filter(
    (s) =>
      s.schema.enumtypes.length > 0 ||
      s.schema.itemtypes.length > 0 ||
      s.schema.relations.length > 0,
  );

  if (sourcesWithContent.length === 0) {
    console.log('[sbu-codegen] No types to generate. Done.');
    return;
  }

  // 4. Generate files per source
  const allFiles: GeneratedFile[] = [];

  for (const source of sourcesWithContent) {
    const files = generateForSource(source, registry, rootDir);
    allFiles.push(...files);
  }

  // 5. Generate shared types for packages/types/src/generated/
  const sharedFiles = generateSharedTypes(registry, rootDir);
  allFiles.push(...sharedFiles);

  // 6. Write all files
  let written = 0;
  for (const file of allFiles) {
    ensureDir(file.filePath);
    writeFileSync(file.filePath, file.content, 'utf-8');
    written++;
  }

  console.log(`[sbu-codegen] Generated ${written} files.`);
}

/**
 * Generate all files for a single extension source.
 * If the extension declares a `targetService` in extension.json,
 * generated code is placed into the corresponding service directory.
 * Otherwise it is generated into the extension directory itself.
 */
function generateForSource(
  source: ParsedSource,
  registry: TypeRegistry,
  rootDir: string,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const baseDir = resolveBaseDir(source.dirPath, rootDir);
  const { schema } = source;

  const enumDefs = schema.enumtypes ?? [];
  const itemtypes = (schema.itemtypes ?? []).map((it) => ({
    ...it,
    extends:
      it.extends ?? (it.code === 'GenericItem' ? undefined : 'GenericItem'),
  }));
  const hasGenericItemExtender = itemtypes.some(
    (it) => it.extends === 'GenericItem',
  );

  // === .gitignore for generated directories ===
  const gitignoreContent = '# AUTO-GENERATED — DO NOT EDIT\n# All files in this directory are generated by sbu-codegen\n*\n!.gitignore\n';

  if (itemtypes.length > 0 || enumDefs.length > 0) {
    const modelsDir = join(baseDir, 'src', 'domain', 'models');
    files.push({ filePath: join(modelsDir, '.gitignore'), content: gitignoreContent });

    const entitiesDir = join(baseDir, 'src', 'infrastructure', 'typeorm');
    files.push({ filePath: join(entitiesDir, '.gitignore'), content: gitignoreContent });

    const mappersDir = join(baseDir, 'src', 'adapters', 'outbound', 'persistence');
    files.push({ filePath: join(mappersDir, '.gitignore'), content: gitignoreContent });

    const dtosDir = join(baseDir, 'src', 'adapters', 'inbound', 'rest', 'dto');
    files.push({ filePath: join(dtosDir, '.gitignore'), content: gitignoreContent });
  }

  // === Enums (shared between domain models and infrastructure) ===
  if (enumDefs.length > 0) {
    const enumsDir = join(baseDir, 'src', 'domain', 'models', 'enums');

    for (const enumDef of enumDefs) {
      const fileName = `${toKebabCase(enumDef.code)}.enum.ts`;
      files.push({
        filePath: join(enumsDir, fileName),
        content: generateEnum(enumDef),
      });
    }

    // Enums barrel
    files.push({
      filePath: join(enumsDir, 'index.ts'),
      content: generateEnumBarrel(enumDefs, (code) => `${toKebabCase(code)}.enum`),
    });
  } else {
    // Create empty enums barrel so imports don't break
    const enumsDir = join(baseDir, 'src', 'domain', 'models', 'enums');
    files.push({
      filePath: join(enumsDir, 'index.ts'),
      content: '// AUTO-GENERATED — DO NOT EDIT\n// No enums defined.\n',
    });
  }

  // === Domain Models ===
  if (itemtypes.length > 0) {
    const modelsDir = join(baseDir, 'src', 'domain', 'models');

    // GenericItem base model if any itemtype extends it
    if (hasGenericItemExtender) {
      files.push({
        filePath: join(modelsDir, 'generic-item.model.ts'),
        content: generateGenericItemModel(),
      });
    }

    for (const itemtype of itemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.model.ts`;
      files.push({
        filePath: join(modelsDir, fileName),
        content: generateDomainModel(itemtype, registry),
      });
    }

    // Models barrel
    files.push({
      filePath: join(modelsDir, 'index.ts'),
      content: generateDomainModelBarrel(itemtypes, hasGenericItemExtender),
    });
  }

  // === TypeORM Entities ===
  if (itemtypes.length > 0) {
    const entitiesDir = join(baseDir, 'src', 'infrastructure', 'typeorm');

    // GenericItemEntity base
    if (hasGenericItemExtender) {
      files.push({
        filePath: join(entitiesDir, 'generic-item.entity.ts'),
        content: generateGenericItemEntity(),
      });
    }

    for (const itemtype of itemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.entity.ts`;
      files.push({
        filePath: join(entitiesDir, fileName),
        content: generateTypeOrmEntity(itemtype, registry),
      });
    }

    // Entities barrel
    files.push({
      filePath: join(entitiesDir, 'index.ts'),
      content: generateEntityBarrel(itemtypes, hasGenericItemExtender),
    });
  }

  // === Mappers ===
  if (itemtypes.length > 0) {
    const mappersDir = join(
      baseDir,
      'src',
      'adapters',
      'outbound',
      'persistence',
    );

    for (const itemtype of itemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.mapper.ts`;
      files.push({
        filePath: join(mappersDir, fileName),
        content: generateMapper(itemtype, registry),
      });
    }

    // Mappers barrel
    files.push({
      filePath: join(mappersDir, 'index.ts'),
      content: generateMapperBarrel(itemtypes),
    });
  }

  // === DTOs ===
  if (itemtypes.length > 0) {
    const dtosDir = join(
      baseDir,
      'src',
      'adapters',
      'inbound',
      'rest',
      'dto',
    );

    for (const itemtype of itemtypes) {
      const fileName = `${toKebabCase(itemtype.code)}.dto.ts`;
      files.push({
        filePath: join(dtosDir, fileName),
        content: generateDtos(itemtype, registry),
      });
    }

    // DTOs barrel
    files.push({
      filePath: join(dtosDir, 'index.ts'),
      content: generateDtoBarrel(itemtypes),
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
 * Resolve the base directory for code generation.
 * If the extension declares a `targetService` in extension.json,
 * output goes to `services/<targetService>/`. Otherwise stays in the extension dir.
 */
function resolveBaseDir(extensionDir: string, rootDir: string): string {
  const extensionJsonPath = join(extensionDir, 'extension.json');
  if (existsSync(extensionJsonPath)) {
    const meta = JSON.parse(readFileSync(extensionJsonPath, 'utf-8'));
    if (meta.targetService) {
      return join(rootDir, 'services', meta.targetService);
    }
  }
  return extensionDir;
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
