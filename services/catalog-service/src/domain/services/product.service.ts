import { Product } from '@domain/models/generated/product.model';
import { ProductServicePort } from '@domain/ports/inbound/product-service.port';
import { ProductRepositoryPort } from '@domain/ports/outbound/product-repository.port';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';

export class ProductService implements ProductServicePort {
  constructor(private readonly productRepository: ProductRepositoryPort) {}

  async findAll(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new EntityNotFoundException('Product', 'id', id);
    }
    return product;
  }

  async findByCode(code: string): Promise<Product> {
    const product = await this.productRepository.findByCode(code);
    if (!product) {
      throw new EntityNotFoundException('Product', 'code', code);
    }
    return product;
  }

  async create(fields: Partial<Product>): Promise<Product> {
    const product = new Product(fields);
    return this.productRepository.save(product);
  }

  async update(id: string, fields: Partial<Product>): Promise<Product> {
    await this.findById(id);
    return this.productRepository.update(id, fields);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.productRepository.remove(id);
  }
}
