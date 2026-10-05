import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MidiaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /** Guarda a foto (disco ou bucket, ver StorageService) e registra a mídia da empresa. */
  async registrar(empresaId: string, conteudo: Buffer, mimetype: string) {
    const url = await this.storage.salvar(empresaId, conteudo, mimetype);
    return this.prisma.midia.create({ data: { empresaId, url } });
  }
}
