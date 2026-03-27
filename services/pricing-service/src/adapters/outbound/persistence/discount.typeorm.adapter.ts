import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount } from '@domain/models/generated/discount.model';
import { DiscountRepositoryPort } from '@domain/ports/outbound/discount-repository.port';
import { DiscountEntity } from '@infrastructure/typeorm/generated/discount.entity';
import { DiscountMapper } from './generated/discount.mapper';

@Injectable()
export class DiscountTypeOrmAdapter implements DiscountRepositoryPort {
  constructor(
    @InjectRepository(DiscountEntity)
    private readonly repo: Repository<DiscountEntity>,
  ) {}

  async findAll(): Promise<Discount[]> {
    const entities = await this.repo.find();
    return entities.map(DiscountMapper.toDomain);
  }

  async findById(id: string): Promise<Discount | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? DiscountMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<Discount | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? DiscountMapper.toDomain(entity) : null;
  }

  async save(discount: Discount): Promise<Discount> {
    const entity = DiscountMapper.toEntity(discount);
    const saved = await this.repo.save(entity);
    return DiscountMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<Discount>): Promise<Discount> {
    const partial = DiscountMapper.toEntity(new Discount({ id, ...fields }));
    await this.repo.save(partial);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return DiscountMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
