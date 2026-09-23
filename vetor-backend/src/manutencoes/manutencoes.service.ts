import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusManutencao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConcluirManutencaoDto } from './dto/concluir-manutencao.dto';

@Injectable()
export class ManutencoesService {
  constructor(private prisma: PrismaService) {}

  pendentes(empresaId: string) {
    return this.prisma.manutencao.findMany({
      // veículo arquivado saiu da frota — suas pendências não aparecem mais
      where: { empresaId, status: StatusManutencao.PENDENTE, veiculo: { arquivadoEm: null } },
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
      include: { itens: { orderBy: { id: 'asc' } } },
      orderBy: { tipoVeiculo: 'asc' },
    });
  }

  async concluir(empresaId: string, id: string, dto: ConcluirManutencaoDto) {
    const manutencao = await this.prisma.manutencao.findFirst({ where: { id, empresaId } });
    if (!manutencao) throw new NotFoundException('Manutenção não encontrada.');
    if (manutencao.status === StatusManutencao.CONCLUIDA) {
      throw new ConflictException('Manutenção já foi concluída.');
    }

    return this.prisma.manutencao.update({
      where: { id },
      data: {
        status: StatusManutencao.CONCLUIDA,
        concluidoEm: new Date(),
        custo: dto.custo,
        oficina: dto.oficina,
      },
      include: { veiculo: true },
    });
  }
}
