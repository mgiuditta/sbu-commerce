/**
 * Parse and validate items.json files, build a unified TypeRegistry.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  ItemsJsonSchema,
  ParsedSource,
  TypeRegistry,
} from './types.js';

/**
 * Discover and parse all items.json files from extensions/ and custom/ directories.
 * Type definitions belong to extensions, not services. The codegen uses the
 * `targetService` field in extension.json to redirect generated output to the
 * appropriate service directory.
 *
 * Order: platform extensions first, then custom (business).
 * This ensures custom itemtypeExtensions can reference platform types.
 */
export function discoverItemsJsonFiles(rootDir: string): ParsedSource[] {
  const sources: ParsedSource[] = [];

  const scanDir = (parentDir: string, sourceType: 'extension' | 'custom') => {
    if (!existsSync(parentDir)) return;

    const entries = readdirSync(parentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const itemsPath = join(parentDir, entry.name, 'items.json');
      if (!existsSync(itemsPath)) continue;

      const raw = readFileSync(itemsPath, 'utf-8');
      const schema = JSON.parse(raw) as ItemsJsonSchema;

      if (!schema.extension) {
        throw new Error(`items.json at ${itemsPath} is missing "extension" field`);
      }

      sources.push({
        filePath: itemsPath,
        dirPath: join(parentDir, entry.name),
        dirName: entry.name,
        sourceType,
        schema,
      });
    }
  };

  // Order: platform extensions → custom extensions
  scanDir(join(rootDir, 'extensions'), 'extension');
  scanDir(join(rootDir, 'custom'), 'custom');

  return sources;
}

/**
 * Build a unified type registry from all parsed sources.
 * Processes sources in order so that custom itemtypeExtensions
 * can merge additional attributes into platform-defined types.
 */
export function buildTypeRegistry(sources: ParsedSource[]): TypeRegistry {
  const registry: TypeRegistry = {
    enums: new Map(),
    itemtypes: new Map(),
    relations: [],
    ownership: new Map(),
  };

  for (const source of sources) {
    const { schema } = source;

    // Register enums
    for (const enumDef of schema.enumtypes ?? []) {
      if (registry.enums.has(enumDef.code)) {
        // Custom can extend enum values
        if (source.sourceType === 'custom') {
          const existing = registry.enums.get(enumDef.code)!;
          const merged = {
            ...existing,
            values: [...new Set([...existing.values, ...enumDef.values])],
          };
          registry.enums.set(enumDef.code, merged);
          continue;
        }
        console.warn(
          `Warning: Enum "${enumDef.code}" redefined in ${source.filePath}, overwriting previous definition.`,
        );
      }
      registry.enums.set(enumDef.code, enumDef);
    }

    // Register itemtypes
    for (const itemtype of schema.itemtypes ?? []) {
      if (registry.itemtypes.has(itemtype.code)) {
        console.warn(
          `Warning: Itemtype "${itemtype.code}" redefined in ${source.filePath}, overwriting previous definition.`,
        );
      }
      registry.itemtypes.set(itemtype.code, itemtype);
      registry.ownership.set(itemtype.code, source.dirName);
    }

    // Apply itemtype extensions (add attributes to existing types)
    for (const ext of schema.itemtypeExtensions ?? []) {
      const existing = registry.itemtypes.get(ext.code);
      if (!existing) {
        throw new Error(
          `itemtypeExtension in ${source.filePath} references "${ext.code}" which does not exist. ` +
          `Make sure the base type is defined in a platform extension or service.`,
        );
      }

      // Merge additional attributes (skip duplicates by name)
      if (ext.attributes) {
        const existingNames = new Set(existing.attributes.map((a) => a.name));
        for (const attr of ext.attributes) {
          if (existingNames.has(attr.name)) {
            console.warn(
              `Warning: Attribute "${attr.name}" on "${ext.code}" already exists, skipping (from ${source.filePath}).`,
            );
            continue;
          }
          existing.attributes.push(attr);
        }
      }
    }

    // Register relations
    for (const relation of schema.relations ?? []) {
      registry.relations.push(relation);
    }
  }

  return registry;
}
