import {UserAccount} from '../../models/generated';

export const TOKEN_PORT = Symbol('TOKEN_PORT');

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string;
  refreshTokenId: string;
}

export interface TokenPort {
  generateTokenPair(
    user: UserAccount,
    refreshTokenId: string,
  ): Promise<TokenPair>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}
