import { PriceList } from '@domain/models/generated/price-list.model';
import { PriceListServicePort } from '@domain/ports/inbound/price-list-service.port';
import { PriceListRepositoryPort } from '@domain/ports/outbound/price-list-repository.port';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';

export class PriceListService implements PriceListServicePort {
  constructor(private readonly priceListRepository: PriceListRepositoryPort) {}

  async findAll(): Promise<PriceList[]> {
    return this.priceListRepository.findAll();
  }

  async findById(id: string): Promise<PriceList> {
    const priceList = await this.priceListRepository.findById(id);
    if (!priceList) {
      throw new EntityNotFoundException('PriceList', 'id', id);
    }
    return priceList;
  }

  async findByCode(code: string): Promise<PriceList> {
    const priceList = await this.priceListRepository.findByCode(code);
    if (!priceList) {
      throw new EntityNotFoundException('PriceList', 'code', code);
    }
    return priceList;
  }

  async create(fields: Partial<PriceList>): Promise<PriceList> {
    const priceList = new PriceList(fields);
    return this.priceListRepository.save(priceList);
  }

  async update(id: string, fields: Partial<PriceList>): Promise<PriceList> {
    await this.findById(id);
    return this.priceListRepository.update(id, fields);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.priceListRepository.remove(id);
  }
}
