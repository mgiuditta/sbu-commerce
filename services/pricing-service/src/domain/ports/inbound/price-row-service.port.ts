import { PriceRow } from '@domain/models/generated/price-row.model';

export const PRICE_ROW_SERVICE_PORT = Symbol('PRICE_ROW_SERVICE_PORT');

export interface PriceRowServicePort {
  findAll(): Promise<PriceRow[]>;
  findById(id: string): Promise<PriceRow>;
  findByProductCode(productCode: string): Promise<PriceRow[]>;
  create(fields: Partial<PriceRow>): Promise<PriceRow>;
  update(id: string, fields: Partial<PriceRow>): Promise<PriceRow>;
  remove(id: string): Promise<void>;
}
