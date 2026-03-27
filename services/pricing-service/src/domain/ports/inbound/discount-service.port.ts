import { Discount } from '@domain/models/generated/discount.model';

export const DISCOUNT_SERVICE_PORT = Symbol('DISCOUNT_SERVICE_PORT');

export interface DiscountServicePort {
  findAll(): Promise<Discount[]>;
  findById(id: string): Promise<Discount>;
  findByCode(code: string): Promise<Discount>;
  create(fields: Partial<Discount>): Promise<Discount>;
  update(id: string, fields: Partial<Discount>): Promise<Discount>;
  remove(id: string): Promise<void>;
}
