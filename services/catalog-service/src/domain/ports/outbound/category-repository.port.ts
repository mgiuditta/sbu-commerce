import { Category } from '../../models/category.model';

export const CATEGORY_REPOSITORY_PORT = Symbol('CATEGORY_REPOSITORY_PORT');

export interface CategoryRepositoryPort {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByCode(code: string): Promise<Category | null>;
  save(category: Category): Promise<Category>;
  update(id: string, fields: Partial<Category>): Promise<Category>;
  remove(id: string): Promise<void>;
}
