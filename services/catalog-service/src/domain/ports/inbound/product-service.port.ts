import { Product } from '@domain/models/generated/product.model';

export const PRODUCT_SERVICE_PORT = Symbol('PRODUCT_SERVICE_PORT');

export interface ProductServicePort {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product>;
  findByCode(code: string): Promise<Product>;
  create(fields: Partial<Product>): Promise<Product>;
  update(id: string, fields: Partial<Product>): Promise<Product>;
  remove(id: string): Promise<void>;
}
