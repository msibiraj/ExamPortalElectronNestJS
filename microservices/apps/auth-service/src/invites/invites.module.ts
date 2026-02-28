import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { InviteToken, InviteTokenSchema } from './schemas/invite-token.schema';
import { InvitesService } from './invites.service';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: InviteToken.name, schema: InviteTokenSchema }]),
    UsersModule,
    OrganizationsModule,
  ],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
