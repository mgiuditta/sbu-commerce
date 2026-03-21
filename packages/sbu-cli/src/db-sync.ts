/**
 * sbu db:sync — genera codice da items.json e sincronizza tutti i DB dei servizi.
 */
import 'reflect-metadata';
import { resolve, join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { DataSource } from 'typeorm';
import { pathToFileURL } from 'url';

/** Mapping servizio → nome database PostgreSQL */
const SERVICE_DB_MAP: Record<string, string> = {
  'catalog-service': 'sbu_catalog',
  'order-service': 'sbu_orders',
  'cart-service': 'sbu_cart',
  'pricing-service': 'sbu_pricing',
  'inventory-service': 'sbu_inventory',
  'auth-service': 'sbu_auth',
  'cms-service': 'sbu_cms',
  'hotfolder-service': 'sbu_hotfolder',
};

interface DbSyncOptions {
  rootDir: string;
  services?: string[];
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export async function dbSync(options: DbSyncOptions): Promise<void> {
  const {
    rootDir,
    services: filterServices,
    host = process.env.DB_HOST || 'localhost',
    port = parseInt(process.env.DB_PORT || '5432', 10),
    user = process.env.DB_USER || 'sbu',
    password = process.env.DB_PASSWORD || 'sbu_secret',
  } = options;

  // 1. Run codegen first
  console.log('[sbu] Step 1/2: Generating code from items.json...');
  const { generate } = await import('@sbu/codegen');
  await generate({ rootDir });

  // 2. Find services with generated entities
  console.log('[sbu] Step 2/2: Synchronizing databases...');
  const servicesDir = join(rootDir, 'services');

  if (!existsSync(servicesDir)) {
    console.log('[sbu] No services/ directory found. Done.');
    return;
  }

  const serviceDirs = readdirSync(servicesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !filterServices || filterServices.includes(name));

  let synced = 0;
  let skipped = 0;

  for (const serviceName of serviceDirs) {
    const entitiesDir = join(servicesDir, serviceName, 'src', 'infrastructure', 'typeorm');
    const dbName = SERVICE_DB_MAP[serviceName];

    if (!existsSync(entitiesDir) || !dbName) {
      skipped++;
      continue;
    }

    const entityFiles = readdirSync(entitiesDir).filter((f) => f.endsWith('.entity.ts'));
    if (entityFiles.length === 0) {
      skipped++;
      continue;
    }

    console.log(`  [${serviceName}] → ${dbName} (${entityFiles.length} entities)`);

    try {
      // Import entity classes dynamically
      const entityClasses: Function[] = [];
      for (const file of entityFiles) {
        const filePath = join(entitiesDir, file);
        const module = await import(pathToFileURL(filePath).href);
        // Export all classes from the module
        for (const exported of Object.values(module)) {
          if (typeof exported === 'function' && exported.name?.endsWith('Entity')) {
            entityClasses.push(exported as Function);
          }
        }
      }

      if (entityClasses.length === 0) {
        console.log(`  [${serviceName}] No entity classes found, skipping`);
        skipped++;
        continue;
      }

      const dataSource = new DataSource({
        type: 'postgres',
        host,
        port,
        username: user,
        password,
        database: dbName,
        entities: entityClasses,
        synchronize: false,
        logging: ['schema'],
      });

      await dataSource.initialize();
      await dataSource.synchronize();
      await dataSource.destroy();

      console.log(`  [${serviceName}] OK`);
      synced++;
    } catch (error: any) {
      console.error(`  [${serviceName}] FAILED: ${error.message}`);
    }
  }

  console.log(`\n[sbu] Done. Synced: ${synced}, Skipped: ${skipped}`);
}
