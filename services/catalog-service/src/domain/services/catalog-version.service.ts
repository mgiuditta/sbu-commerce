import { CatalogVersion } from '@ext/catalog/domain/models/generated/catalog-version.model';
import { CatalogVersionServicePort } from '@domain/ports/inbound/catalog-version-service.port';
import { CatalogVersionRepositoryPort } from '@domain/ports/outbound/catalog-version-repository.port';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';

export class CatalogVersionService implements CatalogVersionServicePort {
  constructor(private readonly catalogVersionRepository: CatalogVersionRepositoryPort) {}

  async findAll(): Promise<CatalogVersion[]> {
    return this.catalogVersionRepository.findAll();
  }

  async findById(id: string): Promise<CatalogVersion> {
    const catalogVersion = await this.catalogVersionRepository.findById(id);
    if (!catalogVersion) {
      throw new EntityNotFoundException('CatalogVersion', 'id', id);
    }
    return catalogVersion;
  }

  async findByVersion(version: string): Promise<CatalogVersion> {
    const catalogVersion = await this.catalogVersionRepository.findByVersion(version);
    if (!catalogVersion) {
      throw new EntityNotFoundException('CatalogVersion', 'version', version);
    }
    return catalogVersion;
  }

  async create(fields: Partial<CatalogVersion>): Promise<CatalogVersion> {
    const catalogVersion = new CatalogVersion(fields);
    return this.catalogVersionRepository.save(catalogVersion);
  }

  async update(id: string, fields: Partial<CatalogVersion>): Promise<CatalogVersion> {
    await this.findById(id);
    return this.catalogVersionRepository.update(id, fields);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.catalogVersionRepository.remove(id);
  }
}
