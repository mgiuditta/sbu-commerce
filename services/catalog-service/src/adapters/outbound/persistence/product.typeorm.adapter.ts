import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@domain/models/generated/product.model';
import { ProductRepositoryPort } from '@domain/ports/outbound/product-repository.port';
import { ProductEntity } from '@infrastructure/typeorm/generated/product.entity';
import { ProductMapper } from './generated/product.mapper';

@Injectable()
export class ProductTypeOrmAdapter implements ProductRepositoryPort {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findAll(): Promise<Product[]> {
    const entities = await this.repo.find();
    return entities.map(ProductMapper.toDomain);
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? ProductMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<Product | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? ProductMapper.toDomain(entity) : null;
  }

  async save(product: Product): Promise<Product> {
    const entity = ProductMapper.toEntity(product);
    const saved = await this.repo.save(entity);
    return ProductMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<Product>): Promise<Product> {
    const partial = ProductMapper.toEntity(new Product({ id, ...fields }));
    await this.repo.save(partial);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return ProductMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
