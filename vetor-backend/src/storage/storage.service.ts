import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';

const EXTENSAO: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' };

/**
 * Onde as fotos das vistorias ficam guardadas (STORAGE_DRIVER):
 * - "local": disco (UPLOADS_DIR), servido pela própria API em /uploads — dev, ou produção com volume persistente;
 * - "s3": qualquer storage S3-compatível (Cloudflare R2, AWS S3, MinIO) — o arquivo é servido pela URL pública do
 *   bucket (S3_PUBLIC_URL), não pela API. Disco de container some a cada deploy; o bucket não.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 's3';
  private readonly s3?: S3Client;

  constructor(private config: ConfigService) {
    this.driver = this.config.get<string>('STORAGE_DRIVER', 'local') === 's3' ? 's3' : 'local';
    if (this.driver === 's3') {
      this.s3 = new S3Client({
        region: this.config.get<string>('S3_REGION', 'auto'),
        endpoint: this.endpointBase(),
        // MinIO e afins só funcionam com path-style (http://host/bucket/chave)
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        credentials: {
          accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID')!,
          secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY')!,
        },
      });
    }
  }

  /**
   * Só protocolo + host. O painel do R2 mostra a "S3 API URL" já com o bucket no fim
   * (https://<id>.r2.cloudflarestorage.com/<bucket>); com esse caminho o SDK grava tudo em <bucket>/<bucket>/midia/...
   * e a URL pública (que lê <bucket>/midia/...) dá 404.
   */
  private endpointBase(): string | undefined {
    const bruto = this.config.get<string>('S3_ENDPOINT');
    if (!bruto) return undefined;
    const base = new URL(bruto).origin;
    if (base !== bruto.replace(/\/+$/, '')) {
      this.logger.warn(`S3_ENDPOINT tinha um caminho (${bruto}) — usando só ${base}. Corrija a variável.`);
    }
    return base;
  }

  get servidoPelaApi(): boolean {
    return this.driver === 'local';
  }

  get diretorioLocal(): string {
    return this.config.get<string>('UPLOADS_DIR', './uploads');
  }

  /** Guarda a foto e devolve a URL pela qual ela é lida. Nome aleatório, separado por empresa (e por pasta no bucket). */
  async salvar(empresaId: string, conteudo: Buffer, mimetype: string, pasta: 'midia' | 'veiculos' = 'midia'): Promise<string> {
    const nome = `${randomUUID()}${EXTENSAO[mimetype] ?? ''}`;
    if (this.driver === 's3') {
      const chave = `${pasta}/${empresaId}/${nome}`;
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

  /** Apaga um arquivo salvo por `salvar` (pela URL devolvida). Falha ao apagar não derruba quem chamou. */
  async apagar(url: string): Promise<void> {
    try {
      if (this.driver === 's3') {
        const base = this.config.get<string>('S3_PUBLIC_URL')!.replace(/\/+$/, '') + '/';
        if (!url.startsWith(base)) return;
        await this.s3!.send(new DeleteObjectCommand({ Bucket: this.config.get<string>('S3_BUCKET')!, Key: url.slice(base.length) }));
      } else if (url.startsWith('/uploads/')) {
        await unlink(join(this.diretorioLocal, basename(url)));
      }
    } catch {
      // arquivo órfão no storage é melhor que erro pro usuário
    }
  }
}
