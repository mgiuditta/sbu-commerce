export const TOKEN_PORT = Symbol('TOKEN_PORT');

export abstract class TokenPort {
  abstract generateAccessToken(payload: Record<string, unknown>): Promise<string>;
  abstract generateRefreshToken(payload: Record<string, unknown>): Promise<string>;
  abstract verifyToken(token: string): Promise<Record<string, unknown>>;
}
