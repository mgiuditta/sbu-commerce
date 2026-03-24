import { CatalogVersion } from '../../models/catalog-version.model';

export const CATALOG_VERSION_REPOSITORY_PORT = Symbol('CATALOG_VERSION_REPOSITORY_PORT');

export interface CatalogVersionRepositoryPort {
  findAll(): Promise<CatalogVersion[]>;
  findById(id: string): Promise<CatalogVersion | null>;
  findByVersion(version: string): Promise<CatalogVersion | null>;
  save(catalogVersion: CatalogVersion): Promise<CatalogVersion>;
  update(id: string, fields: Partial<CatalogVersion>): Promise<CatalogVersion>;
  remove(id: string): Promise<void>;
}
