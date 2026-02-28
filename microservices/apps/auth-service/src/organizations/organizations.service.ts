import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  async create(name: string, code: string): Promise<OrganizationDocument> {
    return this.orgModel.create({ name, code: code.toUpperCase() });
  }

  async findByCode(code: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findOne({ code: code.toUpperCase(), isActive: true }).exec();
  }

  async findAll(): Promise<OrganizationDocument[]> {
    return this.orgModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findById(id).exec();
  }
}
