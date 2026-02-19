import { UserRole } from '../enums';

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}
