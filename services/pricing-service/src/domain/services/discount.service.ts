import { Discount } from '../models/discount.model';
import { DiscountServicePort } from '../ports/inbound/discount-service.port';
import { DiscountRepositoryPort } from '../ports/outbound/discount-repository.port';
import { EntityNotFoundException } from '../exceptions/entity-not-found.exception';

export class DiscountService implements DiscountServicePort {
  constructor(private readonly discountRepository: DiscountRepositoryPort) {}

  async findAll(): Promise<Discount[]> {
    return this.discountRepository.findAll();
  }

  async findById(id: string): Promise<Discount> {
    const discount = await this.discountRepository.findById(id);
    if (!discount) {
      throw new EntityNotFoundException('Discount', 'id', id);
    }
    return discount;
  }

  async findByCode(code: string): Promise<Discount> {
    const discount = await this.discountRepository.findByCode(code);
    if (!discount) {
      throw new EntityNotFoundException('Discount', 'code', code);
    }
    return discount;
  }

  async create(fields: Partial<Discount>): Promise<Discount> {
    const discount = new Discount(fields);
    return this.discountRepository.save(discount);
  }

  async update(id: string, fields: Partial<Discount>): Promise<Discount> {
    await this.findById(id);
    return this.discountRepository.update(id, fields);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    return this.discountRepository.remove(id);
  }
}
