import {Inject, Injectable} from '@nestjs/common';
import type {ConfigType} from '@nestjs/config';
import {JwtService} from '@nestjs/jwt';
import jwtConfig from '@infrastructure/config/jwt.config';
import {UserAccount} from '@domain/models/generated';
import {RefreshTokenPayload, TokenPair, TokenPort,} from '@domain/ports/outbound/token.port';
import {ActiveUserData} from '@adapters/inbound/rest/interfaces/active-user-data.interface';

@Injectable()
export class JwtTokenAdapter implements TokenPort {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async generateTokenPair(
    user: UserAccount,
    refreshTokenId: string,
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          email: user.email,
          userType: user.userType,
          permissions: Array.isArray(user.permissions)
            ? (user.permissions as unknown as string[])
            : [],
        },
      ),
      this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl, {
        refreshTokenId,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.jwtConfiguration.secret,
      audience: this.jwtConfiguration.audience,
      issuer: this.jwtConfiguration.issuer,
    });
  }

  private async signToken<T>(
    userId: string,
    expiresIn: number,
    payload?: T,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, ...payload },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
  }
}
