import { UserAccount } from '@ext/auth/domain/models/generated/user-account.model';
import { UserType } from '@ext/auth/domain/models/generated/enums';
import { AuthenticationServicePort } from '@domain/ports/inbound/authentication-service.port';
import { UserAccountRepositoryPort } from '@domain/ports/outbound/user-account-repository.port';
import { HashingPort } from '@domain/ports/outbound/hashing.port';
import { TokenPort } from '@domain/ports/outbound/token.port';
import { RefreshTokenStoragePort } from '@domain/ports/outbound/refresh-token-storage.port';
import { v4 as uuidv4 } from 'uuid';

export class AuthenticationService implements AuthenticationServicePort {
  constructor(
    private readonly userRepo: UserAccountRepositoryPort,
    private readonly hashing: HashingPort,
    private readonly token: TokenPort,
    private readonly refreshStorage: RefreshTokenStoragePort,
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await this.hashing.hash(password);
    const user = new UserAccount({
      uid: uuidv4(),
      email,
      passwordHash,
      displayName,
      userType: UserType.CUSTOMER,
    });

    const saved = await this.userRepo.save(user);
    return this.generateTokens(saved);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.hashing.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.token.verifyToken(refreshToken);
    const userId = payload.sub as string;

    const isValid = await this.refreshStorage.validate(userId, refreshToken);
    if (!isValid) {
      throw new Error('Invalid refresh token');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.refreshStorage.revoke(userId);
    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshStorage.revoke(userId);
  }

  private async generateTokens(
    user: UserAccount,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: Record<string, unknown> = {
      sub: user.id ?? user.uid,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.token.generateAccessToken(payload),
      this.token.generateRefreshToken(payload),
    ]);

    await this.refreshStorage.store(
      (user.id ?? user.uid) as string,
      refreshToken,
    );

    return { accessToken, refreshToken };
  }
}
