import {CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException,} from '@nestjs/common';
import {Request} from 'express';
import {
    AUTHENTICATION_SERVICE_PORT,
    AuthenticationServicePort,
} from '@domain/ports/inbound/authentication-service.port';
import {REQUEST_USER_KEY} from '@/constants';
import {ActiveUserData} from '../interfaces/active-user-data.interface';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(AUTHENTICATION_SERVICE_PORT)
    private readonly authService: AuthenticationServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractKeyFromHeader(request);
    if (!apiKey) {
      throw new UnauthorizedException();
    }
    try {
      const apiKeyId = this.extractIdFromApiKey(apiKey);
      const user = await this.authService.validateApiKey(apiKeyId, apiKey);
      if (!user) {
        throw new UnauthorizedException();
      }
      request[REQUEST_USER_KEY] = {
        sub: user.id,
        email: user.email,
        userType: user.userType,
        permissions: Array.isArray(user.permissions)
          ? user.permissions
          : [],
      } as ActiveUserData;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractKeyFromHeader(request: Request): string | undefined {
    const [type, key] = request.headers.authorization?.split(' ') ?? [];
    return type === 'ApiKey' ? key : undefined;
  }

  private extractIdFromApiKey(apiKey: string): string {
    const decoded = Buffer.from(apiKey, 'base64').toString('ascii');
    const id = decoded.split(' ')[0];
    if (!id) {
      throw new UnauthorizedException('Invalid API key format');
    }
    return id;
  }
}
