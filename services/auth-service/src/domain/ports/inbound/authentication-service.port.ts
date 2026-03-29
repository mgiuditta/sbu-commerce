import {UserAccount} from '../../models/generated';
import {SocialProvider} from '../../models/generated/enums';
import {TokenPair} from '../outbound/token.port';

export const AUTHENTICATION_SERVICE_PORT = Symbol(
  'AUTHENTICATION_SERVICE_PORT',
);

export interface AuthenticationServicePort {
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<TokenPair>;
  refreshTokens(refreshToken: string): Promise<TokenPair>;
  generateTokens(user: UserAccount): Promise<TokenPair>;
  socialSignIn(
    provider: SocialProvider,
    email: string,
    providerId: string,
    displayName?: string,
  ): Promise<TokenPair>;
  validateApiKey(
    apiKeyId: string,
    rawKey: string,
  ): Promise<UserAccount | null>;
}
