import { Injectable } from '@nestjs/common';
import { Severidade, StatusManutencao, StatusVeiculo } from '@prisma/client';
import { situacaoManutencao } from '../manutencoes/situacao';
import { statusVeiculo } from '../veiculos/estado';
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

    const status = veiculos.map(statusVeiculo);
    const disponiveis = status.filter((s) => s !== StatusVeiculo.MANUTENCAO).length;
    const kmLValidos = veiculos.map((v) => v.kmL).filter((v): v is number => v != null);
    const kmLMedio = kmLValidos.length ? kmLValidos.reduce((a, b) => a + b, 0) / kmLValidos.length : 0;

    return {
      custoSemana: (custoAbastecimentos._sum.valor ?? 0) + (custoManutencoes._sum.custo ?? 0),
      kmLMedio: Math.round(kmLMedio * 10) / 10,
      veiculosDisponiveis: disponiveis,
      totalVeiculos: veiculos.length,
      totalAlertas: alertas.length,
      porStatus: {
        rodando: status.filter((s) => s === StatusVeiculo.RODANDO).length,
        manutencao: status.filter((s) => s === StatusVeiculo.MANUTENCAO).length,
        parado: status.filter((s) => s === StatusVeiculo.PARADO).length,
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
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    // veículo arquivado saiu da frota — não gera mais alerta
    const frotaAtiva = { empresaId, arquivadoEm: null };

    const [manutencoesPendentes, pneusSinalizados, motoristas, abastecimentosAnomalos] = await Promise.all([
      // urgência calculada agora (hodômetro x meta), não a gravada — filtra depois
      this.prisma.manutencao.findMany({
        where: { empresaId, status: StatusManutencao.PENDENTE, veiculo: frotaAtiva },
        include: { veiculo: true },
      }),
      this.prisma.pneuPosicao.findMany({
        where: { veiculo: frotaAtiva, severidade: { in: [Severidade.ATENCAO, Severidade.CRITICO] } },
        include: { veiculo: true },
      }),
      this.prisma.motorista.findMany({ where: { empresaId, validadeCnh: { lte: emNoventaDias, not: null } } }),
      this.prisma.abastecimento.findMany({
        // anomalia antiga não é mais acionável — só os últimos 30 dias
        where: { empresaId, anomalo: true, data: { gte: trintaDiasAtras }, veiculo: frotaAtiva },
        include: { veiculo: true },
        orderBy: { data: 'desc' },
      }),
    ]);

    const dataCurta = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const alertas = [
      ...manutencoesPendentes
        .map((m) => ({ m, s: situacaoManutencao(m, m.veiculo.hodometro, agora) }))
        .filter(({ s }) => s.nivel !== Severidade.OK)
        .map(({ m, s }) => ({
          nivel: s.nivel.toLowerCase(),
          titulo: `${m.item} — ${s.prazo}`,
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
        titulo: `Consumo anômalo${a.kmL != null ? ': ' + a.kmL.toFixed(1).replace('.', ',') + ' km/L' : ''} no abastecimento de ${dataCurta(a.data)}`,
        veiculo: a.veiculo.placa,
        acao: 'combustivel',
      })),
    ];
    // críticos primeiro (sort é estável: dentro do mesmo nível mantém a ordem por origem)
    return alertas.sort((a, b) => (a.nivel === 'critico' ? 0 : 1) - (b.nivel === 'critico' ? 0 : 1));
  }

  /**
   * Custo (abastecimentos + manutenções concluídas) por semana. Sempre devolve `semanas` pontos, com as mesmas
   * semanas de /abastecimentos/km-l-semanal (a atual por último), pra o gráfico do painel parear as duas séries.
   */
  async custoSemanal(empresaId: string, semanas: number) {
    const n = Math.min(Math.max(Number.isFinite(semanas) ? semanas : 8, 1), 52);
    const linhas = await this.prisma.$queryRaw<{ semana: Date; total: number | null }[]>`
      WITH s AS (
        SELECT generate_series(
          date_trunc('week', now()) - (${n - 1}::int * interval '1 week'),
          date_trunc('week', now()),
          interval '1 week'
        ) AS semana
      ),
      custos AS (
        SELECT date_trunc('week', "data") AS semana, "valor" AS valor
        FROM "abastecimentos" WHERE "empresaId" = ${empresaId}
        UNION ALL
        SELECT date_trunc('week', "concluidoEm"), "custo"
        FROM "manutencoes" WHERE "empresaId" = ${empresaId} AND "concluidoEm" IS NOT NULL AND "custo" IS NOT NULL
      )
      SELECT s.semana, SUM(c.valor) AS total
      FROM s LEFT JOIN custos c ON c.semana = s.semana
      GROUP BY s.semana
      ORDER BY s.semana ASC
    `;
    return linhas.map((l) => ({ semana: l.semana, total: Math.round(Number(l.total ?? 0) * 100) / 100 }));
  }
}
