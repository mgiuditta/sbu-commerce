import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {UserAccountRepositoryPort} from '@domain/ports/outbound/user-account-repository.port';
import {UserAccount} from '@domain/models/generated';
import {SocialProvider} from '@domain/models/generated/enums';
import {UserAccountEntity} from '@infrastructure/typeorm/generated/user-account.entity';
import {SocialIdentityEntity} from '@infrastructure/typeorm/generated/social-identity.entity';
import {ApiKeyEntity} from '@infrastructure/typeorm/generated/api-key.entity';
import {UserAccountMapper} from '../persistence/generated/user-account.mapper';

@Injectable()
export class UserAccountTypeOrmAdapter implements UserAccountRepositoryPort {
  constructor(
    @InjectRepository(UserAccountEntity)
    private readonly userRepo: Repository<UserAccountEntity>,
    @InjectRepository(SocialIdentityEntity)
    private readonly socialIdentityRepo: Repository<SocialIdentityEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepo: Repository<ApiKeyEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserAccount | null> {
    const entity = await this.userRepo.findOne({ where: { email } });
    return entity ? UserAccountMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    const entity = await this.userRepo.findOne({ where: { id } });
    return entity ? UserAccountMapper.toDomain(entity) : null;
  }

  async save(user: UserAccount): Promise<UserAccount> {
    const entity = UserAccountMapper.toEntity(user);
    const saved = await this.userRepo.save(entity);
    return UserAccountMapper.toDomain(saved);
  }

  async update(id: string, fields: Partial<UserAccount>): Promise<void> {
    await this.userRepo.update({ id }, fields as any);
  }

  async findUserBySocialProvider(
    provider: SocialProvider,
    providerId: string,
  ): Promise<UserAccount | null> {
    const identity = await this.socialIdentityRepo.findOne({
      where: { provider, providerId },
      relations: { userAccount: true },
    });
    if (!identity?.userAccount) return null;
    return UserAccountMapper.toDomain(identity.userAccount);
  }

  async createSocialIdentity(
    userId: string,
    provider: SocialProvider,
    providerId: string,
    email?: string,
    displayName?: string,
  ): Promise<void> {
    const identity = new SocialIdentityEntity();
    identity.provider = provider;
    identity.providerId = providerId;
    if (email) identity.email = email;
    if (displayName) identity.displayName = displayName;
    identity.userAccount = { id: userId } as UserAccountEntity;
    await this.socialIdentityRepo.save(identity);
  }

  async findApiKeyWithUser(
    apiKeyId: string,
  ): Promise<{ keyHash: string; user: UserAccount } | null> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { id: apiKeyId, active: true },
      relations: { userAccount: true },
    });
    if (!apiKey?.userAccount) return null;
    return {
      keyHash: apiKey.keyHash,
      user: UserAccountMapper.toDomain(apiKey.userAccount),
    };
  }
}
