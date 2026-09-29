import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });
    this.bucket = this.config.get('AWS_S3_BUCKET')!;
  }

  // Frontend asks for a signed URL, uploads the file DIRECTLY to S3 with it,
  // then just saves the resulting public URL against the product. Keeps large
  // files off your API server entirely.
  async getPresignedUploadUrl(fileName: string, fileType: string) {
    const key = `products/${randomUUID()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 60 });
    const publicUrl = `https://${this.bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;
    return { uploadUrl, publicUrl };
  }
}
