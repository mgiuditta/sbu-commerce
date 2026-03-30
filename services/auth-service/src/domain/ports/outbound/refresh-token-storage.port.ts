export const REFRESH_TOKEN_STORAGE_PORT = Symbol('REFRESH_TOKEN_STORAGE_PORT');

export abstract class RefreshTokenStoragePort {
  abstract store(userId: string, token: string): Promise<void>;
  abstract validate(userId: string, token: string): Promise<boolean>;
  abstract revoke(userId: string): Promise<void>;
}
