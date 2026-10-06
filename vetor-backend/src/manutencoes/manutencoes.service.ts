import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Manutencao, StatusManutencao, Veiculo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConcluirManutencaoDto } from './dto/concluir-manutencao.dto';
import { CreateManutencaoDto } from './dto/create-manutencao.dto';
import { compararSituacao, situacaoManutencao } from './situacao';

/** Pendência com km restante, urgência e prazo calculados agora (não os gravados). */
function comSituacao(m: Manutencao & { veiculo: Veiculo }) {
  return { ...m, ...situacaoManutencao(m, m.veiculo.hodometro) };
}

@Injectable()
export class ManutencoesService {
  constructor(private prisma: PrismaService) {}

  async pendentes(empresaId: string) {
    const pendentes = await this.prisma.manutencao.findMany({
      // veículo arquivado saiu da frota — suas pendências não aparecem mais
      where: { empresaId, status: StatusManutencao.PENDENTE, veiculo: { arquivadoEm: null } },
      include: { veiculo: true },
    });
    return pendentes.map(comSituacao).sort(compararSituacao);
  }

  /** Agenda uma manutenção pro veículo: meta por km (hodômetro), por data, ou as duas — vence no que chegar antes. */
  async criar(empresaId: string, dto: CreateManutencaoDto) {
    if (dto.kmAlvo == null && !dto.dataLimite) {
      throw new BadRequestException('Informe o km e/ou a data limite da manutenção.');
    }
    const veiculo = await this.prisma.veiculo.findFirst({ where: { id: dto.veiculoId, empresaId, arquivadoEm: null } });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    const criada = await this.prisma.manutencao.create({
      data: {
        empresaId,
        veiculoId: veiculo.id,
        item: dto.item.trim(),
        kmAlvo: dto.kmAlvo ?? null,
        dataLimite: dto.dataLimite ? new Date(dto.dataLimite) : null,
      },
      include: { veiculo: true },
    });
    return comSituacao(criada);
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
