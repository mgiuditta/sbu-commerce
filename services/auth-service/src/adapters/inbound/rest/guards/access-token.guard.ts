import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { TOKEN_PORT, TokenPort } from '@domain/ports/outbound/token.port';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_PORT) private readonly tokenPort: TokenPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.slice(7);
    try {
      request.user = await this.tokenPort.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }
}
