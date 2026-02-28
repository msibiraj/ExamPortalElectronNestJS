import {
  Injectable,
  BadRequestException,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InviteToken, InviteTokenDocument } from './schemas/invite-token.schema';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class InvitesService {
  constructor(
    @InjectModel(InviteToken.name)
    private readonly inviteModel: Model<InviteTokenDocument>,
    private readonly usersService: UsersService,
    private readonly orgsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  async createInvite(orgId: string, role: string, createdBy: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.inviteModel.create({
      token,
      organizationId: new Types.ObjectId(orgId),
      role,
      createdBy: new Types.ObjectId(createdBy),
      expiresAt,
    });

    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:4000');
    return {
      token: invite.token,
      link: `${baseUrl}/invite/${invite.token}`,
      expiresAt: invite.expiresAt,
      role: invite.role,
    };
  }

  async getInvite(token: string) {
    const invite = await this.inviteModel.findOne({ token }).exec();
    if (!invite) {
      throw new RpcException(new NotFoundException('Invite link not found'));
    }
    if (invite.isUsed) {
      throw new RpcException(new GoneException('Invite link has already been used'));
    }
    if (invite.expiresAt < new Date()) {
      throw new RpcException(new GoneException('Invite link has expired'));
    }

    const org = await this.orgsService.findById(invite.organizationId.toString());
    return {
      token: invite.token,
      role: invite.role,
      orgName: org?.name ?? 'Unknown Organization',
      expiresAt: invite.expiresAt,
    };
  }

  async redeemInvite(token: string, name: string, email: string, password: string) {
    const invite = await this.inviteModel.findOne({ token }).exec();
    if (!invite) {
      throw new RpcException(new NotFoundException('Invite link not found'));
    }
    if (invite.isUsed) {
      throw new RpcException(new GoneException('Invite link has already been used'));
    }
    if (invite.expiresAt < new Date()) {
      throw new RpcException(new GoneException('Invite link has expired'));
    }

    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.usersService.create({
      name,
      email,
      password: hashedPassword,
      role: invite.role,
      organizationId: invite.organizationId.toString(),
    });

    await this.inviteModel.findByIdAndUpdate(invite._id, {
      $set: { isUsed: true, usedAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
