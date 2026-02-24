import { UserRole } from '../enums';

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId: string;
  type: 'access' | 'refresh';
}
