import {randomUUID} from 'crypto';
import {UserAccount} from '../models/generated';
import {SocialProvider, UserStatus, UserType} from '../models/generated/enums';
import {AuthenticationServicePort} from '../ports/inbound/authentication-service.port';
import {HashingPort} from '../ports/outbound/hashing.port';
import {RefreshTokenStoragePort} from '../ports/outbound/refresh-token-storage.port';
import {TokenPair, TokenPort} from '../ports/outbound/token.port';
import {UserAccountRepositoryPort} from '../ports/outbound/user-account-repository.port';
import {InvalidCredentialsError, InvalidRefreshTokenError, UserAlreadyExistsError,} from '../exceptions';

export class AuthenticationService implements AuthenticationServicePort {
  constructor(
    private readonly userAccountRepository: UserAccountRepositoryPort,
    private readonly hashingService: HashingPort,
    private readonly tokenService: TokenPort,
    private readonly refreshTokenStorage: RefreshTokenStoragePort,
  ) {}

  async signUp(email: string, password: string): Promise<void> {
    const existing = await this.userAccountRepository.findByEmail(email);
    if (existing) {
      throw new UserAlreadyExistsError();
    }
    const passwordHash = await this.hashingService.hash(password);
    const user = new UserAccount({
      uid: randomUUID(),
      email,
      passwordHash,
      userType: UserType.CUSTOMER,
      status: UserStatus.ACTIVE,
      emailVerified: false,
      loginCount: 0,
      failedLoginAttempts: 0,
    });
    await this.userAccountRepository.save(user);
  }

  async signIn(email: string, password: string): Promise<TokenPair> {
    const user = await this.userAccountRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }
    const isEqual = await this.hashingService.compare(
      password,
      user.passwordHash,
    );
    if (!isEqual) {
      throw new InvalidCredentialsError();
    }
    return this.generateTokens(user);
  }

  async generateTokens(user: UserAccount): Promise<TokenPair> {
    const refreshTokenId = randomUUID();
    const tokenPair = await this.tokenService.generateTokenPair(
      user,
      refreshTokenId,
    );
    await this.refreshTokenStorage.insert(user.id, refreshTokenId);
    return tokenPair;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const { sub, refreshTokenId } =
        await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.userAccountRepository.findById(sub);
      if (!user) {
        throw new InvalidCredentialsError();
      }
      await this.refreshTokenStorage.validate(user.id, refreshTokenId);
      await this.refreshTokenStorage.invalidate(user.id);
      return this.generateTokens(user);
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) {
        throw err;
      }
      throw new InvalidCredentialsError();
    }
  }

  async socialSignIn(
    provider: SocialProvider,
    email: string,
    providerId: string,
    displayName?: string,
  ): Promise<TokenPair> {
    let user = await this.userAccountRepository.findUserBySocialProvider(
      provider,
      providerId,
    );
    if (!user) {
      user = new UserAccount({
        uid: randomUUID(),
        email,
        displayName,
        userType: UserType.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });
      user = await this.userAccountRepository.save(user);
      await this.userAccountRepository.createSocialIdentity(
        user.id,
        provider,
        providerId,
        email,
        displayName,
      );
    }
    return this.generateTokens(user);
  }

  async validateApiKey(
    apiKeyId: string,
    rawKey: string,
  ): Promise<UserAccount | null> {
    const result =
      await this.userAccountRepository.findApiKeyWithUser(apiKeyId);
    if (!result) return null;
    const isValid = await this.hashingService.compare(
      rawKey,
      result.keyHash,
    );
    return isValid ? result.user : null;
  }
}
