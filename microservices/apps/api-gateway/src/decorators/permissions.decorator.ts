import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '@app/shared';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...perms: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
