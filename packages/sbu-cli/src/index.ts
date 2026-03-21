#!/usr/bin/env tsx
import { resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'generate': {
      const { generate } = await import('@sbu/codegen');
      const rootDir = resolve(process.cwd());
      await generate({ rootDir });
      break;
    }

    case 'db:sync': {
      const { dbSync } = await import('./db-sync.js');
      const rootDir = resolve(process.cwd());
      const serviceFilter = args[1] ? args.slice(1) : undefined;
      await dbSync({ rootDir, services: serviceFilter });
      break;
    }

    case 'extension:create': {
      const name = args[1];
      const target = args[2] || 'custom'; // 'custom' (default) or 'extensions'
      if (!name) {
        console.error('Usage: sbu extension:create <name> [custom|extensions]');
        console.error('  custom     → business customization (default)');
        console.error('  extensions → platform extension');
        process.exit(1);
      }

      if (target !== 'custom' && target !== 'extensions') {
        console.error(`Invalid target "${target}". Use "custom" or "extensions".`);
        process.exit(1);
      }

      const rootDir = resolve(process.cwd());
      createExtension(rootDir, name, target);
      break;
    }

    default:
      console.log('sbu-cli v0.0.1');
      console.log('');
      console.log('Commands:');
      console.log('  generate                            Generate code from items.json');
      console.log('  db:sync [service...]                Generate + sync all DBs (or specific ones)');
      console.log('  extension:create <name> [target]    Create a new extension');
      console.log('');
      console.log('Targets for extension:create:');
      console.log('  custom      Business customization (default)');
      console.log('  extensions  Platform extension');
  }
}

function createExtension(rootDir: string, name: string, target: string): void {
  const extDir = join(rootDir, target, name);

  if (existsSync(extDir)) {
    console.error(`Extension "${name}" already exists at ${extDir}`);
    process.exit(1);
  }

  console.log(`[sbu] Creating ${target} extension: ${name}`);

  // Create directories
  const dirs = [
    join(extDir, 'src', 'domain', 'models'),
    join(extDir, 'src', 'domain', 'ports', 'inbound'),
    join(extDir, 'src', 'domain', 'ports', 'outbound'),
    join(extDir, 'src', 'domain', 'services'),
    join(extDir, 'src', 'adapters', 'inbound', 'rest', 'dto'),
    join(extDir, 'src', 'adapters', 'inbound', 'nats'),
    join(extDir, 'src', 'adapters', 'outbound', 'persistence'),
    join(extDir, 'src', 'adapters', 'outbound', 'messaging'),
    join(extDir, 'src', 'hooks'),
    join(extDir, 'src', 'infrastructure', 'typeorm'),
    join(extDir, 'src', 'infrastructure', 'config'),
    join(extDir, 'frontend', 'components'),
    join(extDir, 'test', 'unit'),
    join(extDir, 'test', 'integration'),
  ];

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.gitkeep'), '', 'utf-8');
  }

  // extension.json
  writeFileSync(
    join(extDir, 'extension.json'),
    JSON.stringify(
      {
        name,
        version: '0.0.1',
        description: '',
        dependencies: ['core'],
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  // items.json
  writeFileSync(
    join(extDir, 'items.json'),
    JSON.stringify(
      {
        $schema: 'https://sbu.io/items-schema/v1',
        extension: name,
        enumtypes: [],
        itemtypes: [],
        itemtypeExtensions: [],
        relations: [],
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  // package.json
  writeFileSync(
    join(extDir, 'package.json'),
    JSON.stringify(
      {
        name: `@sbu/${target === 'custom' ? 'custom-' : ''}${name}`,
        version: '0.0.1',
        private: true,
        main: 'src/index.ts',
        scripts: {
          build: 'tsc',
          test: 'jest',
          clean: 'rm -rf dist',
        },
        dependencies: {
          '@nestjs/common': '^11.0.0',
          '@nestjs/core': '^11.0.0',
        },
        devDependencies: {
          '@types/node': '^22.0.0',
          typescript: '^5.7.0',
        },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  // tsconfig.json
  writeFileSync(
    join(extDir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '../../tsconfig.json',
        compilerOptions: {
          outDir: './dist',
          rootDir: './src',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          paths: {
            '@domain/*': ['./src/domain/*'],
            '@domain/models': ['./src/domain/models'],
            '@domain/models/*': ['./src/domain/models/*'],
            '@adapters/*': ['./src/adapters/*'],
            '@infrastructure/*': ['./src/infrastructure/*'],
            '@sbu/types': ['../../packages/types/src'],
            '@sbu/types/*': ['../../packages/types/src/*'],
          },
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'test'],
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  // index.ts — module export
  const pascalName = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  writeFileSync(
    join(extDir, 'src', 'index.ts'),
    `import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class ${pascalName}Extension {
  static register(): DynamicModule {
    return {
      module: ${pascalName}Extension,
      providers: [],
      exports: [],
    };
  }
}
`,
    'utf-8',
  );

  console.log(`[sbu] Extension created at ${extDir}`);
  console.log('');
  console.log('Structure:');
  console.log(`  ${target}/${name}/`);
  console.log('  ├── extension.json     Extension metadata');
  console.log('  ├── items.json         Type definitions & extensions');
  console.log('  ├── package.json');
  console.log('  ├── src/');
  console.log('  │   ├── index.ts       NestJS module');
  console.log('  │   ├── domain/        Domain models, ports, services');
  console.log('  │   ├── adapters/      REST/NATS inbound, persistence outbound');
  console.log('  │   ├── hooks/         Override platform behavior');
  console.log('  │   └── infrastructure/');
  console.log('  ├── frontend/          Next.js components');
  console.log('  └── test/');
  console.log('');
  console.log('To extend existing types, use itemtypeExtensions in items.json:');
  console.log('  {');
  console.log('    "itemtypeExtensions": [');
  console.log('      {');
  console.log('        "code": "Product",');
  console.log('        "attributes": [');
  console.log('          { "name": "customField", "type": "string" }');
  console.log('        ]');
  console.log('      }');
  console.log('    ]');
  console.log('  }');
}

main().catch(console.error);
