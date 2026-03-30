import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceList } from '@ext/commerce/domain/models/generated/price-list.model';
import { PriceListRepositoryPort } from '@domain/ports/outbound/price-list-repository.port';
import { PriceListEntity } from '@ext/commerce/infrastructure/typeorm/generated/price-list.entity';
import { PriceListMapper } from '@ext/commerce/adapters/outbound/persistence/generated/price-list.mapper';

@Injectable()
export class PriceListTypeOrmAdapter implements PriceListRepositoryPort {
  constructor(
    @InjectRepository(PriceListEntity)
    private readonly repo: Repository<PriceListEntity>,
  ) {}

  async findAll(): Promise<PriceList[]> {
    const entities = await this.repo.find();
    return entities.map(PriceListMapper.toDomain);
  }

  async findById(id: string): Promise<PriceList | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? PriceListMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<PriceList | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? PriceListMapper.toDomain(entity) : null;
  }

  async save(priceList: PriceList): Promise<PriceList> {
    const entity = PriceListMapper.toEntity(priceList);
    const saved = await this.repo.save(entity);
    return PriceListMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<PriceList>): Promise<PriceList> {
    const partial = PriceListMapper.toEntity(new PriceList({ id, ...fields }));
    await this.repo.save(partial);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return PriceListMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
