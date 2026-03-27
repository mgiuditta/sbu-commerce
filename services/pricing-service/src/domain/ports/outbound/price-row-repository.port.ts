import { PriceRow } from '@domain/models/generated/price-row.model';

export const PRICE_ROW_REPOSITORY_PORT = Symbol('PRICE_ROW_REPOSITORY_PORT');

export interface PriceRowRepositoryPort {
  findAll(): Promise<PriceRow[]>;
  findById(id: string): Promise<PriceRow | null>;
  findByProductCode(productCode: string): Promise<PriceRow[]>;
  save(priceRow: PriceRow): Promise<PriceRow>;
  update(id: string, fields: Partial<PriceRow>): Promise<PriceRow>;
  remove(id: string): Promise<void>;
}
