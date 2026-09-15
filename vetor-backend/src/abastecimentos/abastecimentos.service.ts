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
        where: { veiculoId: dto.veiculoId, kmL: { not: null } },
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

    await this.prisma.veiculo.update({
      where: { id: dto.veiculoId },
      data: { hodometro: dto.hodometro, ...(kmL != null ? { kmL } : {}) },
    });

    return abastecimento;
  }

  async kmLSemanal(empresaId: string, semanas: number) {
    const desde = new Date();
    desde.setDate(desde.getDate() - semanas * 7);

    const linhas = await this.prisma.$queryRaw<{ semana: Date; media: number }[]>`
      SELECT date_trunc('week', "data") AS semana, AVG("kmL") AS media
      FROM "abastecimentos"
      WHERE "empresaId" = ${empresaId} AND "data" >= ${desde} AND "kmL" IS NOT NULL
      GROUP BY semana
      ORDER BY semana ASC
    `;
    return linhas.map((l) => ({ semana: l.semana, kmLMedio: Number(l.media) }));
  }
}
