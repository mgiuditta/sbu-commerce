import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAccount } from '@ext/auth/domain/models/generated/user-account.model';
import { UserAccountEntity } from '@ext/auth/infrastructure/typeorm/generated/user-account.entity';
import { UserAccountMapper } from '@ext/auth/adapters/outbound/persistence/generated/user-account.mapper';
import { UserAccountRepositoryPort } from '@domain/ports/outbound/user-account-repository.port';

@Injectable()
export class UserAccountTypeOrmAdapter implements UserAccountRepositoryPort {
  constructor(
    @InjectRepository(UserAccountEntity)
    private readonly repo: Repository<UserAccountEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserAccount | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? UserAccountMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? UserAccountMapper.toDomain(entity) : null;
  }

  async save(user: UserAccount): Promise<UserAccount> {
    const entity = UserAccountMapper.toEntity(user);
    const saved = await this.repo.save(entity);
    return UserAccountMapper.toDomain(saved);
  }
}
