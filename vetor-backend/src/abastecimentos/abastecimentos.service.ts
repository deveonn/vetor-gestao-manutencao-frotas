import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAbastecimentoDto } from './dto/create-abastecimento.dto';

/** Abaixo de 80% da média das últimas leituras válidas do veículo, o abastecimento é sinalizado. */
const LIMIAR_ANOMALIA = 0.8;

@Injectable()
export class AbastecimentosService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.abastecimento.findMany({
      where: { empresaId },
      include: { veiculo: true, fornecedor: true },
      orderBy: { data: 'desc' },
    });
  }

  async criar(empresaId: string, dto: CreateAbastecimentoDto) {
    const veiculo = await this.prisma.veiculo.findFirst({ where: { id: dto.veiculoId, empresaId } });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    const fornecedor = await this.prisma.fornecedor.findFirst({ where: { id: dto.fornecedorId, empresaId } });
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado.');

    const data = dto.data ? new Date(dto.data) : new Date();

    // km/L calculado contra o abastecimento anterior do mesmo veículo — ver nota em endpoints.md.
    const anterior = await this.prisma.abastecimento.findFirst({
      where: { veiculoId: dto.veiculoId, data: { lt: data } },
      orderBy: { data: 'desc' },
    });

    let kmL: number | null = null;
    if (anterior && dto.hodometro > anterior.hodometro) {
      const kmRodado = dto.hodometro - anterior.hodometro;
      kmL = Math.round((kmRodado / dto.litros) * 10) / 10;
    }

    let anomalo = false;
    if (kmL != null) {
      const ultimos = await this.prisma.abastecimento.findMany({
        where: { veiculoId: dto.veiculoId, kmL: { not: null }, data: { lt: data } },
        orderBy: { data: 'desc' },
        take: 5,
      });
      if (ultimos.length > 0) {
        const media = ultimos.reduce((soma, a) => soma + (a.kmL ?? 0), 0) / ultimos.length;
        anomalo = kmL < media * LIMIAR_ANOMALIA;
      }
    }

    const abastecimento = await this.prisma.abastecimento.create({
      data: {
        empresaId,
        veiculoId: dto.veiculoId,
        fornecedorId: dto.fornecedorId,
        litros: dto.litros,
        valor: dto.valor,
        hodometro: dto.hodometro,
        data,
        kmL,
        anomalo,
      },
      include: { veiculo: true, fornecedor: true },
    });

    // lançamento retroativo (hodômetro abaixo do atual) não pode fazer o hodômetro/km-L do veículo voltar no tempo
    if (dto.hodometro >= veiculo.hodometro) {
      await this.prisma.veiculo.update({
        where: { id: dto.veiculoId },
        data: { hodometro: dto.hodometro, ...(kmL != null ? { kmL } : {}) },
      });
    }

    return abastecimento;
  }

  /** Sempre devolve `semanas` pontos (a semana atual é a última); semana sem leitura vem com kmLMedio null. */
  async kmLSemanal(empresaId: string, semanas: number) {
    const n = Math.min(Math.max(Number.isFinite(semanas) ? semanas : 8, 1), 52);
    const linhas = await this.prisma.$queryRaw<{ semana: Date; media: number | null }[]>`
      SELECT s.semana, AVG(a."kmL") AS media
      FROM generate_series(
        date_trunc('week', now()) - (${n - 1}::int * interval '1 week'),
        date_trunc('week', now()),
        interval '1 week'
      ) AS s(semana)
      LEFT JOIN "abastecimentos" a
        ON date_trunc('week', a."data") = s.semana AND a."empresaId" = ${empresaId} AND a."kmL" IS NOT NULL
      GROUP BY s.semana
      ORDER BY s.semana ASC
    `;
    return linhas.map((l) => ({
      semana: l.semana,
      kmLMedio: l.media == null ? null : Math.round(Number(l.media) * 10) / 10,
    }));
  }
}
