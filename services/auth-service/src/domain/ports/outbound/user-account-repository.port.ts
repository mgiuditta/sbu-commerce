import { UserAccount } from '@ext/auth/domain/models/generated/user-account.model';

export const USER_ACCOUNT_REPOSITORY_PORT = Symbol('USER_ACCOUNT_REPOSITORY_PORT');

export abstract class UserAccountRepositoryPort {
  abstract findByEmail(email: string): Promise<UserAccount | null>;
  abstract findById(id: string): Promise<UserAccount | null>;
  abstract save(user: UserAccount): Promise<UserAccount>;
}
