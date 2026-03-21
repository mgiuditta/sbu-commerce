import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './infrastructure/config/typeorm.config';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig())],
  controllers: [],
  providers: [],
})
export class CatalogModule {}
