import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE, ORG_PATTERNS } from '@app/shared';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}

  async create(name: string, code: string) {
    return firstValueFrom(
      this.authClient.send(ORG_PATTERNS.CREATE, { name, code }),
    );
  }

  async list() {
    return firstValueFrom(
      this.authClient.send(ORG_PATTERNS.LIST, {}),
    );
  }

  async findByCode(code: string) {
    return firstValueFrom(
      this.authClient.send(ORG_PATTERNS.FIND_BY_CODE, { code }),
    );
  }
}
