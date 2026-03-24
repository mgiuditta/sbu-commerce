import { Category } from '../models/category.model';
import { CategoryServicePort } from '../ports/inbound/category-service.port';
import { CategoryRepositoryPort } from '../ports/outbound/category-repository.port';
import { EntityNotFoundException } from '../exceptions/entity-not-found.exception';

export class CategoryService implements CategoryServicePort {
  constructor(private readonly categoryRepository: CategoryRepositoryPort) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new EntityNotFoundException('Category', 'id', id);
    }
    return category;
  }

  async findByCode(code: string): Promise<Category> {
    const category = await this.categoryRepository.findByCode(code);
    if (!category) {
      throw new EntityNotFoundException('Category', 'code', code);
    }
    return category;
  }

  async create(fields: Partial<Category>): Promise<Category> {
    const category = new Category(fields);
    return this.categoryRepository.save(category);
  }

  async update(id: string, fields: Partial<Category>): Promise<Category> {
    await this.findById(id);
    return this.categoryRepository.update(id, fields);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.categoryRepository.remove(id);
  }
}
