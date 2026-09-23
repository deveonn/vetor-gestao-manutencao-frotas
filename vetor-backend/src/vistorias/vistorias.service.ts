import { Injectable, NotFoundException } from '@nestjs/common';
import { AvaliacaoVistoria, Severidade } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVistoriaDto } from './dto/create-vistoria.dto';

function severidadeDoPneu(avaliacao: AvaliacaoVistoria): Severidade {
  if (avaliacao === AvaliacaoVistoria.TROCAR) return Severidade.CRITICO;
  if (avaliacao === AvaliacaoVistoria.ATENCAO) return Severidade.ATENCAO;
  return Severidade.OK;
}

@Injectable()
export class VistoriasService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.vistoria.findMany({
      where: { empresaId },
      include: { veiculo: true, motorista: true, itens: { include: { midia: true } } },
      orderBy: { iniciadoEm: 'desc' },
    });
  }

  minhas(empresaId: string, motoristaId: string) {
    return this.prisma.vistoria.findMany({
      where: { empresaId, motoristaId },
      include: { veiculo: true, itens: { include: { midia: true } } },
      orderBy: { iniciadoEm: 'desc' },
    });
  }

  async criar(empresaId: string, motoristaId: string, dto: CreateVistoriaDto) {
    const veiculo = await this.prisma.veiculo.findFirst({ where: { id: dto.veiculoId, empresaId } });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');

    const temAlertaCritico = dto.itens.some((i) => i.avaliacao === AvaliacaoVistoria.TROCAR);
    const temAlertaAtencao = dto.itens.some((i) => i.avaliacao === AvaliacaoVistoria.ATENCAO);

    const vistoria = await this.prisma.vistoria.create({
      data: {
        empresaId,
        veiculoId: dto.veiculoId,
        motoristaId,
        iniciadoEm: dto.iniciadoEm ? new Date(dto.iniciadoEm) : new Date(),
        concluidoEm: new Date(),
        temAlertaCritico,
        temAlertaAtencao,
        itens: {
          createMany: {
            data: dto.itens.map((i) => ({
              stepId: i.stepId,
              label: i.label,
              avaliacao: i.avaliacao,
              observacao: i.observacao,
              midiaId: i.midiaId,
            })),
          },
        },
      },
      include: { itens: { include: { midia: true } } },
    });

    // pneus sinalizados na vistoria atualizam o resumo por posição do veículo
    // (GET /veiculos já retorna esse resumo, sem precisar reprocessar vistorias antigas).
    const itensPneu = dto.itens.filter((i) => i.stepId === 'pneus');
    for (const item of itensPneu) {
      await this.prisma.pneuPosicao.upsert({
        where: { veiculoId_posicao: { veiculoId: dto.veiculoId, posicao: item.label } },
        create: { veiculoId: dto.veiculoId, posicao: item.label, severidade: severidadeDoPneu(item.avaliacao), observacao: item.observacao },
        // null explícito: sem observação nesta vistoria, a observação antiga do pneu não pode sobrar
        update: { severidade: severidadeDoPneu(item.avaliacao), observacao: item.observacao ?? null },
      });
    }

    return vistoria;
  }
}
