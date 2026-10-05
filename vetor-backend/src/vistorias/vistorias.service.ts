import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    // idempotência da fila offline: o app reenvia se a resposta se perdeu — devolve a que já existe
    if (dto.clienteId) {
      const existente = await this.prisma.vistoria.findFirst({
        where: { clienteId: dto.clienteId, empresaId, motoristaId },
        include: { itens: { include: { midia: true } } },
      });
      if (existente) return existente;
    }

    const veiculo = await this.prisma.veiculo.findFirst({ where: { id: dto.veiculoId, empresaId } });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');

    // foto referenciada tem que ser da mesma empresa (midiaId vem do cliente)
    const midiaIds = [...new Set(dto.itens.map((i) => i.midiaId).filter((id): id is string => !!id))];
    if (midiaIds.length) {
      const encontradas = await this.prisma.midia.count({ where: { id: { in: midiaIds }, empresaId } });
      if (encontradas !== midiaIds.length) throw new BadRequestException('Foto não encontrada.');
    }

    const temAlertaCritico = dto.itens.some((i) => i.avaliacao === AvaliacaoVistoria.TROCAR);
    const temAlertaAtencao = dto.itens.some((i) => i.avaliacao === AvaliacaoVistoria.ATENCAO);

    const vistoria = await this.prisma.vistoria.create({
      data: {
        empresaId,
        veiculoId: dto.veiculoId,
        motoristaId,
        clienteId: dto.clienteId,
        iniciadoEm: dto.iniciadoEm ? new Date(dto.iniciadoEm) : new Date(),
        // relógio do celular pode estar adiantado: nunca no futuro
        concluidoEm: dto.concluidoEm ? new Date(Math.min(Date.parse(dto.concluidoEm), Date.now())) : new Date(),
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
