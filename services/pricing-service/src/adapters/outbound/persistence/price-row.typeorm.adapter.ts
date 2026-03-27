import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceRow } from '@domain/models/generated/price-row.model';
import { PriceRowRepositoryPort } from '@domain/ports/outbound/price-row-repository.port';
import { PriceRowEntity } from '@infrastructure/typeorm/generated/price-row.entity';
import { PriceRowMapper } from './generated/price-row.mapper';

@Injectable()
export class PriceRowTypeOrmAdapter implements PriceRowRepositoryPort {
  constructor(
    @InjectRepository(PriceRowEntity)
    private readonly repo: Repository<PriceRowEntity>,
  ) {}

  async findAll(): Promise<PriceRow[]> {
    const entities = await this.repo.find();
    return entities.map(PriceRowMapper.toDomain);
  }

  async findById(id: string): Promise<PriceRow | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? PriceRowMapper.toDomain(entity) : null;
  }

  async findByProductCode(productCode: string): Promise<PriceRow[]> {
    const entities = await this.repo.find({ where: { productCode } });
    return entities.map(PriceRowMapper.toDomain);
  }

  async save(priceRow: PriceRow): Promise<PriceRow> {
    const entity = PriceRowMapper.toEntity(priceRow);
    const saved = await this.repo.save(entity);
    return PriceRowMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<PriceRow>): Promise<PriceRow> {
    const partial = PriceRowMapper.toEntity(new PriceRow({ id, ...fields }));
    await this.repo.save(partial);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return PriceRowMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
