import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET') ?? '';
    this.region = config.get<string>('AWS_REGION') ?? 'us-east-1';
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.enabled = !!(this.bucket && accessKeyId && secretAccessKey);

    if (this.enabled) {
      this.client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  /**
   * Upload a base64 JPEG snapshot to S3.
   * @param base64  data:image/jpeg;base64,<data>  or raw base64 string
   * @param key     S3 object key, e.g. violations/examId/candidateId/timestamp.jpg
   * @returns       Public HTTPS URL or null if upload failed / S3 disabled
   */
  async uploadSnapshot(base64: string, key: string): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const raw = base64.startsWith('data:')
        ? base64.split(',')[1]
        : base64;
      const buffer = Buffer.from(raw, 'base64');

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'image/jpeg',
        }),
      );

      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (err) {
      this.logger.warn(`S3 upload failed for key ${key}: ${err?.message}`);
      return null;
    }
  }
}
