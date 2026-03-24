import { Category } from '../../models/category.model';

export const CATEGORY_SERVICE_PORT = Symbol('CATEGORY_SERVICE_PORT');

export interface CategoryServicePort {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category>;
  findByCode(code: string): Promise<Category>;
  create(fields: Partial<Category>): Promise<Category>;
  update(id: string, fields: Partial<Category>): Promise<Category>;
  remove(id: string): Promise<void>;
}
