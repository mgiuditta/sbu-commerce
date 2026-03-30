export const AUTHENTICATION_SERVICE_PORT = Symbol('AUTHENTICATION_SERVICE_PORT');

export abstract class AuthenticationServicePort {
  abstract register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;

  abstract login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;

  abstract refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;

  abstract logout(userId: string): Promise<void>;
}
