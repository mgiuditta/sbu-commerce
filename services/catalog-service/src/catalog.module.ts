import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './infrastructure/config/typeorm.config';
import { ProductEntity } from './infrastructure/typeorm/product.entity';
import { CategoryEntity } from './infrastructure/typeorm/category.entity';
import { CatalogVersionEntity } from './infrastructure/typeorm/catalog-version.entity';
import { ProductController } from './adapters/inbound/rest/product.controller';
import { ProductService } from './domain/services/product.service';
import { ProductTypeOrmAdapter } from './adapters/outbound/persistence/product.typeorm.adapter';
import { PRODUCT_SERVICE_PORT } from './domain/ports/inbound/product-service.port';
import { PRODUCT_REPOSITORY_PORT } from './domain/ports/outbound/product-repository.port';
import { DomainExceptionFilter } from './adapters/inbound/rest/filters/domain-exception.filter';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig()),
    TypeOrmModule.forFeature([ProductEntity, CategoryEntity, CatalogVersionEntity]),
  ],
  controllers: [ProductController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: PRODUCT_REPOSITORY_PORT,
      useClass: ProductTypeOrmAdapter,
    },
    {
      provide: PRODUCT_SERVICE_PORT,
      useFactory: (repo: InstanceType<typeof ProductTypeOrmAdapter>) =>
        new ProductService(repo),
      inject: [PRODUCT_REPOSITORY_PORT],
    },
  ],
})
export class CatalogModule {}
