import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers?.['x-api-key'];
    if (!apiKey) {
      return false;
    }
    // TODO: validate API key against database
    return true;
  }
}
