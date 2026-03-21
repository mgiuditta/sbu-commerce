import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function typeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'sbu',
    password: process.env.DB_PASSWORD || 'sbu_secret',
    database: process.env.DB_NAME || 'sbu_catalog',
    entities: [__dirname + '/../typeorm/*.entity{.ts,.js}'],
    // In dev: synchronize adds/updates columns without dropping existing ones.
    // In production: use migrations instead.
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
}
