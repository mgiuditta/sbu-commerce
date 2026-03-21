/**
 * Generate TypeScript enum files from enumtypes definitions.
 */
import type { EnumTypeDefinition, GeneratedFile } from '../types.js';

const HEADER = '// AUTO-GENERATED — DO NOT EDIT\n';

/**
 * Generate a single enum file content.
 */
export function generateEnum(enumDef: EnumTypeDefinition): string {
  const lines: string[] = [HEADER];

  lines.push(`export enum ${enumDef.code} {`);
  for (const value of enumDef.values) {
    lines.push(`  ${value} = '${value}',`);
  }
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate an index barrel file for all enums.
 */
export function generateEnumBarrel(enumDefs: EnumTypeDefinition[], fileNameFn: (code: string) => string): string {
  const lines: string[] = [HEADER];
  for (const enumDef of enumDefs) {
    lines.push(`export { ${enumDef.code} } from './${fileNameFn(enumDef.code)}';`);
  }
  lines.push('');
  return lines.join('\n');
}
