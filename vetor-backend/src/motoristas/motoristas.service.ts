import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMotoristaDto } from './dto/create-motorista.dto';

@Injectable()
export class MotoristasService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.motorista.findMany({
      where: { empresaId },
      include: { veiculoAtual: true },
      orderBy: { nome: 'asc' },
    });
  }

  criar(empresaId: string, dto: CreateMotoristaDto) {
    return this.prisma.motorista.create({
      data: {
        empresaId,
        nome: dto.nome,
        categoriaCnh: dto.categoriaCnh,
        validadeCnh: dto.validadeCnh ? new Date(dto.validadeCnh) : null,
      },
    });
  }
}
