import { PriceRow } from '@ext/commerce/domain/models/generated/price-row.model';
import { PriceRowServicePort } from '@domain/ports/inbound/price-row-service.port';
import { PriceRowRepositoryPort } from '@domain/ports/outbound/price-row-repository.port';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';

export class PriceRowService implements PriceRowServicePort {
  constructor(private readonly priceRowRepository: PriceRowRepositoryPort) {}

  async findAll(): Promise<PriceRow[]> {
    return this.priceRowRepository.findAll();
  }

  async findById(id: string): Promise<PriceRow> {
    const priceRow = await this.priceRowRepository.findById(id);
    if (!priceRow) {
      throw new EntityNotFoundException('PriceRow', 'id', id);
    }
    return priceRow;
  }

  async findByProductCode(productCode: string): Promise<PriceRow[]> {
    return this.priceRowRepository.findByProductCode(productCode);
  }

  async create(fields: Partial<PriceRow>): Promise<PriceRow> {
    const priceRow = new PriceRow(fields);
    return this.priceRowRepository.save(priceRow);
  }

  async update(id: string, fields: Partial<PriceRow>): Promise<PriceRow> {
    await this.findById(id);
    return this.priceRowRepository.update(id, fields);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.priceRowRepository.remove(id);
  }
}
