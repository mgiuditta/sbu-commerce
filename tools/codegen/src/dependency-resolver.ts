/**
 * Transitive dependency resolver for codegen multi-target.
 *
 * Given a list of "direct" itemtype codes assigned to a service,
 * resolves all transitive dependencies (extends chain, attribute
 * relations, global relations) from the unified TypeRegistry.
 */
import type { TypeRegistry } from './types.js';

/**
 * BFS-based dependency resolution. Starting from `directCodes`,
 * collects all itemtypes reachable through:
 *   1. Extends chain (e.g. PriceRow → GenericItem)
 *   2. Attribute relation types (e.g. PriceRow.currency → Currency)
 *
 * Global relations (OneToMany, ManyToMany) are NOT followed transitively.
 * They are handled at generation time by the `availableCodes` filter
 * in generators — relations whose other side is unavailable are skipped.
 *
 * Returns a deduplicated list of all itemtype codes needed.
 */
export function resolveDependencies(
  directCodes: string[],
  registry: TypeRegistry,
): string[] {
  const resolved = new Set<string>();
  const queue = [...directCodes];

  while (queue.length > 0) {
    const code = queue.shift()!;
    if (resolved.has(code)) continue;

    const itemtype = registry.itemtypes.get(code);
    if (!itemtype) {
      console.warn(
        `[sbu-codegen] Warning: itemtype "${code}" not found in registry, skipping.`,
      );
      continue;
    }

    resolved.add(code);

    // 1. Extends chain
    if (itemtype.extends && !resolved.has(itemtype.extends)) {
      queue.push(itemtype.extends);
    }

    // 2. Attribute relation types (types that are other itemtypes)
    for (const attr of itemtype.attributes) {
      if (registry.itemtypes.has(attr.type) && !resolved.has(attr.type)) {
        queue.push(attr.type);
      }
    }
  }

  return Array.from(resolved);
}
