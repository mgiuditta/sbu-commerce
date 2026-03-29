export const REFRESH_TOKEN_STORAGE_PORT = Symbol('REFRESH_TOKEN_STORAGE_PORT');

export interface RefreshTokenStoragePort {
  insert(userId: string, tokenId: string): Promise<void>;
  /**
   * Validates the stored refresh token ID against the provided one.
   * Throws InvalidRefreshTokenError if a different token is stored (possible token theft).
   */
  validate(userId: string, tokenId: string): Promise<boolean>;
  invalidate(userId: string): Promise<void>;
}
