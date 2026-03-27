import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogVersion } from '@domain/models/generated/catalog-version.model';
import { CatalogVersionRepositoryPort } from '@domain/ports/outbound/catalog-version-repository.port';
import { CatalogVersionEntity } from '@infrastructure/typeorm/generated/catalog-version.entity';
import { CatalogVersionMapper } from './generated/catalog-version.mapper';

@Injectable()
export class CatalogVersionTypeOrmAdapter implements CatalogVersionRepositoryPort {
  constructor(
    @InjectRepository(CatalogVersionEntity)
    private readonly repo: Repository<CatalogVersionEntity>,
  ) {}

  async findAll(): Promise<CatalogVersion[]> {
    const entities = await this.repo.find();
    return entities.map(CatalogVersionMapper.toDomain);
  }

  async findById(id: string): Promise<CatalogVersion | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? CatalogVersionMapper.toDomain(entity) : null;
  }

  async findByVersion(version: string): Promise<CatalogVersion | null> {
    const entity = await this.repo.findOne({ where: { version } });
    return entity ? CatalogVersionMapper.toDomain(entity) : null;
  }

  async save(catalogVersion: CatalogVersion): Promise<CatalogVersion> {
    const entity = CatalogVersionMapper.toEntity(catalogVersion);
    const saved = await this.repo.save(entity);
    return CatalogVersionMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<CatalogVersion>): Promise<CatalogVersion> {
    const partial = CatalogVersionMapper.toEntity(new CatalogVersion({ id, ...fields }));
    await this.repo.save(partial);
    const updated = await this.repo.findOneOrFail({ where: { id } });
    return CatalogVersionMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
