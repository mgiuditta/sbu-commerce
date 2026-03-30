import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permissions || permissions.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.permissions) {
      return false;
    }
    return permissions.some((perm) => Object.keys(user.permissions).includes(perm));
  }
}
