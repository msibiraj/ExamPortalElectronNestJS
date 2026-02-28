import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequirePermissions decorator — skip this guard
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    // Only enforce for admins — proctors/students are controlled by RolesGuard
    if (user.role !== 'admin') {
      return true;
    }

    // null permissions = unrestricted admin (backward compatible)
    if (user.permissions == null) {
      return true;
    }

    const missing = required.filter((p) => !user.permissions.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permission${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
