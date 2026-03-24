import { PriceList } from '../../models/price-list.model';

export const PRICE_LIST_REPOSITORY_PORT = Symbol('PRICE_LIST_REPOSITORY_PORT');

export interface PriceListRepositoryPort {
  findAll(): Promise<PriceList[]>;
  findById(id: string): Promise<PriceList | null>;
  findByCode(code: string): Promise<PriceList | null>;
  save(priceList: PriceList): Promise<PriceList>;
  update(id: string, fields: Partial<PriceList>): Promise<PriceList>;
  remove(id: string): Promise<void>;
}
