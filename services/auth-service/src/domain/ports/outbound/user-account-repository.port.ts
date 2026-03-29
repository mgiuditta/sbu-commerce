import {UserAccount} from '../../models/generated';
import {SocialProvider} from '../../models/generated/enums';

export const USER_ACCOUNT_REPOSITORY_PORT = Symbol(
  'USER_ACCOUNT_REPOSITORY_PORT',
);

export interface UserAccountRepositoryPort {
  findByEmail(email: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserAccount | null>;
  save(user: UserAccount): Promise<UserAccount>;
  update(id: string, fields: Partial<UserAccount>): Promise<void>;

  findUserBySocialProvider(
    provider: SocialProvider,
    providerId: string,
  ): Promise<UserAccount | null>;
  createSocialIdentity(
    userId: string,
    provider: SocialProvider,
    providerId: string,
    email?: string,
    displayName?: string,
  ): Promise<void>;

  findApiKeyWithUser(
    apiKeyId: string,
  ): Promise<{ keyHash: string; user: UserAccount } | null>;
}
