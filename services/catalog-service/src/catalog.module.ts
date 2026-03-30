import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from '@infrastructure/config/typeorm.config';
import { ProductEntity } from '@ext/catalog/infrastructure/typeorm/generated/product.entity';
import { CategoryEntity } from '@ext/catalog/infrastructure/typeorm/generated/category.entity';
import { CatalogVersionEntity } from '@ext/catalog/infrastructure/typeorm/generated/catalog-version.entity';
import { ProductController } from '@adapters/inbound/rest/product.controller';
import { CategoryController } from '@adapters/inbound/rest/category.controller';
import { CatalogVersionController } from '@adapters/inbound/rest/catalog-version.controller';
import { ProductService } from '@domain/services/product.service';
import { CategoryService } from '@domain/services/category.service';
import { CatalogVersionService } from '@domain/services/catalog-version.service';
import { ProductTypeOrmAdapter } from '@adapters/outbound/persistence/product.typeorm.adapter';
import { CategoryTypeOrmAdapter } from '@adapters/outbound/persistence/category.typeorm.adapter';
import { CatalogVersionTypeOrmAdapter } from '@adapters/outbound/persistence/catalog-version.typeorm.adapter';
import { PRODUCT_SERVICE_PORT } from '@domain/ports/inbound/product-service.port';
import { PRODUCT_REPOSITORY_PORT } from '@domain/ports/outbound/product-repository.port';
import { CATEGORY_SERVICE_PORT } from '@domain/ports/inbound/category-service.port';
import { CATEGORY_REPOSITORY_PORT } from '@domain/ports/outbound/category-repository.port';
import { CATALOG_VERSION_SERVICE_PORT } from '@domain/ports/inbound/catalog-version-service.port';
import { CATALOG_VERSION_REPOSITORY_PORT } from '@domain/ports/outbound/catalog-version-repository.port';
import { DomainExceptionFilter } from '@adapters/inbound/rest/filters/domain-exception.filter';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig()),
    TypeOrmModule.forFeature([ProductEntity, CategoryEntity, CatalogVersionEntity]),
  ],
  controllers: [ProductController, CategoryController, CatalogVersionController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    // Product
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
    // Category
    {
      provide: CATEGORY_REPOSITORY_PORT,
      useClass: CategoryTypeOrmAdapter,
    },
    {
      provide: CATEGORY_SERVICE_PORT,
      useFactory: (repo: InstanceType<typeof CategoryTypeOrmAdapter>) =>
        new CategoryService(repo),
      inject: [CATEGORY_REPOSITORY_PORT],
    },
    // CatalogVersion
    {
      provide: CATALOG_VERSION_REPOSITORY_PORT,
      useClass: CatalogVersionTypeOrmAdapter,
    },
    {
      provide: CATALOG_VERSION_SERVICE_PORT,
      useFactory: (repo: InstanceType<typeof CatalogVersionTypeOrmAdapter>) =>
        new CatalogVersionService(repo),
      inject: [CATALOG_VERSION_REPOSITORY_PORT],
    },
  ],
})
export class CatalogModule {}
