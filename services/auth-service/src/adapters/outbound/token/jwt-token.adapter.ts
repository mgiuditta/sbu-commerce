import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPort } from '@domain/ports/outbound/token.port';

@Injectable()
export class JwtTokenAdapter implements TokenPort {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(payload: Record<string, unknown>): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(payload: Record<string, unknown>): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: '7d' });
  }

  async verifyToken(token: string): Promise<Record<string, unknown>> {
    return this.jwtService.verifyAsync(token);
  }
}
