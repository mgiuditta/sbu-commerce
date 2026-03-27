import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '@domain/models/generated/category.model';
import { CategoryRepositoryPort } from '@domain/ports/outbound/category-repository.port';
import { CategoryEntity } from '@infrastructure/typeorm/generated/category.entity';
import { CategoryMapper } from './generated/category.mapper';

@Injectable()
export class CategoryTypeOrmAdapter implements CategoryRepositoryPort {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repo: Repository<CategoryEntity>,
  ) {}

  async findAll(): Promise<Category[]> {
    const entities = await this.repo.find();
    return entities.map(CategoryMapper.toDomain);
  }

  async findById(id: string): Promise<Category | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? CategoryMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<Category | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? CategoryMapper.toDomain(entity) : null;
  }

  async save(category: Category): Promise<Category> {
    const entity = CategoryMapper.toEntity(category);
    const saved = await this.repo.save(entity);
    return CategoryMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<Category>): Promise<Category> {
    const partial = CategoryMapper.toEntity(new Category({ id, ...fields }));
    await this.repo.save(partial);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return CategoryMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
