import { PriceList } from '@domain/models/generated/price-list.model';

export const PRICE_LIST_SERVICE_PORT = Symbol('PRICE_LIST_SERVICE_PORT');

export interface PriceListServicePort {
  findAll(): Promise<PriceList[]>;
  findById(id: string): Promise<PriceList>;
  findByCode(code: string): Promise<PriceList>;
  create(fields: Partial<PriceList>): Promise<PriceList>;
  update(id: string, fields: Partial<PriceList>): Promise<PriceList>;
  remove(id: string): Promise<void>;
}
