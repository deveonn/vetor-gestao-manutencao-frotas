import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MidiaService {
  constructor(private prisma: PrismaService) {}

  registrar(empresaId: string, filename: string) {
    return this.prisma.midia.create({
      data: { empresaId, url: `/uploads/${filename}` },
    });
  }
}
