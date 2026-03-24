import { CatalogVersion } from '../../models/catalog-version.model';

export const CATALOG_VERSION_SERVICE_PORT = Symbol('CATALOG_VERSION_SERVICE_PORT');

export interface CatalogVersionServicePort {
  findAll(): Promise<CatalogVersion[]>;
  findById(id: string): Promise<CatalogVersion>;
  findByVersion(version: string): Promise<CatalogVersion>;
  create(fields: Partial<CatalogVersion>): Promise<CatalogVersion>;
  update(id: string, fields: Partial<CatalogVersion>): Promise<CatalogVersion>;
  remove(id: string): Promise<void>;
}
