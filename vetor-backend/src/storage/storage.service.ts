import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const EXTENSAO: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' };

/**
 * Onde as fotos das vistorias ficam guardadas (STORAGE_DRIVER):
 * - "local": disco (UPLOADS_DIR), servido pela própria API em /uploads — dev, ou produção com volume persistente;
 * - "s3": qualquer storage S3-compatível (Cloudflare R2, AWS S3, MinIO) — o arquivo é servido pela URL pública do
 *   bucket (S3_PUBLIC_URL), não pela API. Disco de container some a cada deploy; o bucket não.
 */
@Injectable()
export class StorageService {
  private readonly driver: 'local' | 's3';
  private readonly s3?: S3Client;

  constructor(private config: ConfigService) {
    this.driver = this.config.get<string>('STORAGE_DRIVER', 'local') === 's3' ? 's3' : 'local';
    if (this.driver === 's3') {
      this.s3 = new S3Client({
        region: this.config.get<string>('S3_REGION', 'auto'),
        endpoint: this.config.get<string>('S3_ENDPOINT') || undefined,
        // MinIO e afins só funcionam com path-style (http://host/bucket/chave)
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        credentials: {
          accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID')!,
          secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY')!,
        },
      });
    }
  }

  get servidoPelaApi(): boolean {
    return this.driver === 'local';
  }

  get diretorioLocal(): string {
    return this.config.get<string>('UPLOADS_DIR', './uploads');
  }

  /** Guarda a foto e devolve a URL pela qual ela é lida. Nome aleatório, separado por empresa. */
  async salvar(empresaId: string, conteudo: Buffer, mimetype: string): Promise<string> {
    const nome = `${randomUUID()}${EXTENSAO[mimetype] ?? ''}`;
    if (this.driver === 's3') {
      const chave = `midia/${empresaId}/${nome}`;
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.config.get<string>('S3_BUCKET')!,
          Key: chave,
          Body: conteudo,
          ContentType: mimetype,
        }),
      );
      return `${this.config.get<string>('S3_PUBLIC_URL')!.replace(/\/+$/, '')}/${chave}`;
    }
    await mkdir(this.diretorioLocal, { recursive: true });
    await writeFile(join(this.diretorioLocal, nome), conteudo);
    return `/uploads/${nome}`;
  }
}
