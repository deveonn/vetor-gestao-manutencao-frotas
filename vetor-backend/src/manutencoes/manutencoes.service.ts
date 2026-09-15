import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusManutencao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConcluirManutencaoDto } from './dto/concluir-manutencao.dto';

@Injectable()
export class ManutencoesService {
  constructor(private prisma: PrismaService) {}

  pendentes(empresaId: string) {
    return this.prisma.manutencao.findMany({
      where: { empresaId, status: StatusManutencao.PENDENTE },
      include: { veiculo: true },
      orderBy: { kmRestante: 'asc' },
    });
  }

  historico(empresaId: string) {
    return this.prisma.manutencao.findMany({
      where: { empresaId, status: StatusManutencao.CONCLUIDA },
      include: { veiculo: true },
      orderBy: { concluidoEm: 'desc' },
    });
  }

  planos(empresaId: string) {
    return this.prisma.planoManutencao.findMany({
      where: { empresaId },
      include: { itens: true },
    });
  }

  async concluir(empresaId: string, id: string, dto: ConcluirManutencaoDto) {
    const manutencao = await this.prisma.manutencao.findFirst({ where: { id, empresaId } });
    if (!manutencao) throw new NotFoundException('Manutenção não encontrada.');

    return this.prisma.manutencao.update({
      where: { id },
      data: {
        status: StatusManutencao.CONCLUIDA,
        concluidoEm: new Date(),
        custo: dto.custo,
        oficina: dto.oficina,
      },
    });
  }
}
