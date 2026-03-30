import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await this.accessTokenGuard.canActivate(context);
      if (result) return true;
    } catch {}

    try {
      return await this.apiKeyGuard.canActivate(context);
    } catch {
      return false;
    }
  }
}
