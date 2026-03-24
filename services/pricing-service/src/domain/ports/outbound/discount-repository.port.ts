import { Discount } from '../../models/discount.model';

export const DISCOUNT_REPOSITORY_PORT = Symbol('DISCOUNT_REPOSITORY_PORT');

export interface DiscountRepositoryPort {
  findAll(): Promise<Discount[]>;
  findById(id: string): Promise<Discount | null>;
  findByCode(code: string): Promise<Discount | null>;
  save(discount: Discount): Promise<Discount>;
  update(id: string, fields: Partial<Discount>): Promise<Discount>;
  remove(id: string): Promise<void>;
}
