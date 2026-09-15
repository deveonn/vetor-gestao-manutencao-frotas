import { Injectable } from '@nestjs/common';
import { Severidade, StatusManutencao, StatusVeiculo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async resumo(empresaId: string) {
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - 7);

    const [veiculos, custoAbastecimentos, custoManutencoes, alertas] = await Promise.all([
      this.prisma.veiculo.findMany({ where: { empresaId, arquivadoEm: null } }),
      this.prisma.abastecimento.aggregate({ where: { empresaId, data: { gte: inicioSemana } }, _sum: { valor: true } }),
      this.prisma.manutencao.aggregate({
        where: { empresaId, status: StatusManutencao.CONCLUIDA, concluidoEm: { gte: inicioSemana } },
        _sum: { custo: true },
      }),
      this.alertas(empresaId),
    ]);

    const disponiveis = veiculos.filter((v) => v.status !== StatusVeiculo.MANUTENCAO).length;
    const kmLValidos = veiculos.map((v) => v.kmL).filter((v): v is number => v != null);
    const kmLMedio = kmLValidos.length ? kmLValidos.reduce((a, b) => a + b, 0) / kmLValidos.length : 0;

    return {
      custoSemana: (custoAbastecimentos._sum.valor ?? 0) + (custoManutencoes._sum.custo ?? 0),
      kmLMedio: Math.round(kmLMedio * 10) / 10,
      veiculosDisponiveis: disponiveis,
      totalVeiculos: veiculos.length,
      totalAlertas: alertas.length,
      porStatus: {
        rodando: veiculos.filter((v) => v.status === StatusVeiculo.RODANDO).length,
        manutencao: veiculos.filter((v) => v.status === StatusVeiculo.MANUTENCAO).length,
        parado: veiculos.filter((v) => v.status === StatusVeiculo.PARADO).length,
      },
    };
  }

  /**
   * Alertas são computados na hora a partir de manutenção/pneus/CNH/consumo — não existe uma
   * tabela "Alerta" persistida (ver nota em endpoints.md: "computar em runtime evita duplicar estado").
   */
  async alertas(empresaId: string) {
    const agora = new Date();
    const emNoventaDias = new Date();
    emNoventaDias.setDate(emNoventaDias.getDate() + 90);

    const [manutencoesPendentes, pneusSinalizados, motoristas, abastecimentosAnomalos] = await Promise.all([
      this.prisma.manutencao.findMany({
        where: { empresaId, status: StatusManutencao.PENDENTE, nivel: { in: [Severidade.ATENCAO, Severidade.CRITICO] } },
        include: { veiculo: true },
      }),
      this.prisma.pneuPosicao.findMany({
        where: { veiculo: { empresaId }, severidade: { in: [Severidade.ATENCAO, Severidade.CRITICO] } },
        include: { veiculo: true },
      }),
      this.prisma.motorista.findMany({ where: { empresaId, validadeCnh: { lte: emNoventaDias, not: null } } }),
      this.prisma.abastecimento.findMany({
        where: { empresaId, anomalo: true },
        include: { veiculo: true },
        orderBy: { data: 'desc' },
        take: 5,
      }),
    ]);

    return [
      ...manutencoesPendentes.map((m) => ({
        nivel: m.nivel!.toLowerCase(),
        titulo: `${m.item}${m.prazo ? ' — ' + m.prazo : ''}`,
        veiculo: m.veiculo.placa,
        acao: 'manutencao',
      })),
      ...pneusSinalizados.map((p) => ({
        nivel: p.severidade.toLowerCase(),
        titulo: `Pneu ${p.posicao} sinalizado${p.observacao ? ' — ' + p.observacao : ''}`,
        veiculo: p.veiculo.placa,
        acao: 'pneus',
      })),
      ...motoristas.map((m) => ({
        nivel: m.validadeCnh! <= agora ? 'critico' : 'atencao',
        titulo: `CNH de ${m.nome} ${m.validadeCnh! <= agora ? 'vencida' : 'vence em breve'}`,
        veiculo: null,
        acao: 'motoristas',
      })),
      ...abastecimentosAnomalos.map((a) => ({
        nivel: 'atencao',
        titulo: `Consumo anômalo no abastecimento de ${a.data.toLocaleDateString('pt-BR')}`,
        veiculo: a.veiculo.placa,
        acao: 'combustivel',
      })),
    ];
  }

  async custoSemanal(empresaId: string, semanas: number) {
    const desde = new Date();
    desde.setDate(desde.getDate() - semanas * 7);

    const [abastecimentos, manutencoes] = await Promise.all([
      this.prisma.$queryRaw<{ semana: Date; total: number }[]>`
        SELECT date_trunc('week', "data") AS semana, SUM("valor") AS total
        FROM "abastecimentos"
        WHERE "empresaId" = ${empresaId} AND "data" >= ${desde}
        GROUP BY semana
      `,
      this.prisma.$queryRaw<{ semana: Date; total: number }[]>`
        SELECT date_trunc('week', "concluidoEm") AS semana, SUM("custo") AS total
        FROM "manutencoes"
        WHERE "empresaId" = ${empresaId} AND "concluidoEm" >= ${desde}
        GROUP BY semana
      `,
    ]);

    const porSemana = new Map<string, number>();
    for (const linha of [...abastecimentos, ...manutencoes]) {
      const chave = linha.semana.toISOString();
      porSemana.set(chave, (porSemana.get(chave) ?? 0) + Number(linha.total ?? 0));
    }

    return Array.from(porSemana.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, total]) => ({ semana, total }));
  }
}
