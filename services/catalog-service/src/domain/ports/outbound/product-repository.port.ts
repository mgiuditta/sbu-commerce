import { Product } from '../../models/product.model';

export const PRODUCT_REPOSITORY_PORT = Symbol('PRODUCT_REPOSITORY_PORT');

export interface ProductRepositoryPort {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findByCode(code: string): Promise<Product | null>;
  save(product: Product): Promise<Product>;
  update(id: string, fields: Partial<Product>): Promise<Product>;
  remove(id: string): Promise<void>;
}
