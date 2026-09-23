import { Injectable } from '@nestjs/common';
import { StatusManutencao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  /**
   * "Pneus" não tem uma tabela de custo própria ainda — uma troca de pneu, quando registrada,
   * entra como um item de Manutencao (ver comentário em prisma/schema.prisma) e já soma em
   * "Manutenção" abaixo. Por isso só duas categorias reais, não as três do mock original.
   */
  private async categoriasPeriodo(empresaId: string, inicioAtual: Date, fimAtual: Date, inicioAnterior: Date, fimAnterior: Date) {
    const [combustivelAtual, combustivelAnterior, manutencaoAtual, manutencaoAnterior] = await Promise.all([
      this.prisma.abastecimento.aggregate({ where: { empresaId, data: { gte: inicioAtual, lt: fimAtual } }, _sum: { valor: true } }),
      this.prisma.abastecimento.aggregate({ where: { empresaId, data: { gte: inicioAnterior, lt: fimAnterior } }, _sum: { valor: true } }),
      this.prisma.manutencao.aggregate({
        where: { empresaId, status: StatusManutencao.CONCLUIDA, concluidoEm: { gte: inicioAtual, lt: fimAtual } },
        _sum: { custo: true },
      }),
      this.prisma.manutencao.aggregate({
        where: { empresaId, status: StatusManutencao.CONCLUIDA, concluidoEm: { gte: inicioAnterior, lt: fimAnterior } },
        _sum: { custo: true },
      }),
    ]);

    return [
      { categoria: 'Combustível', atual: combustivelAtual._sum.valor ?? 0, anterior: combustivelAnterior._sum.valor ?? 0 },
      { categoria: 'Manutenção', atual: manutencaoAtual._sum.custo ?? 0, anterior: manutencaoAnterior._sum.custo ?? 0 },
    ];
  }

  categoriasSemana(empresaId: string) {
    const inicioAtual = new Date();
    inicioAtual.setDate(inicioAtual.getDate() - 7);
    const inicioAnterior = new Date();
    inicioAnterior.setDate(inicioAnterior.getDate() - 14);
    return this.categoriasPeriodo(empresaId, inicioAtual, new Date(), inicioAnterior, inicioAtual);
  }

  categoriasMensal(empresaId: string, mesA: string, mesB: string) {
    const [inicioA, fimA] = this.limitesDoMes(mesA);
    // antes o mês B não tinha fim: somava tudo de inicioB até hoje
    const [inicioB, fimB] = this.limitesDoMes(mesB);
    return this.categoriasPeriodo(empresaId, inicioB, fimB, inicioA, fimA);
  }

  private limitesDoMes(mes: string): [Date, Date] {
    const [ano, mesNum] = mes.split('-').map(Number);
    const inicio = new Date(ano, mesNum - 1, 1);
    const fim = new Date(ano, mesNum, 1);
    return [inicio, fim];
  }

  /**
   * km rodado no período é aproximado por (maior hodômetro − menor hodômetro) entre os
   * abastecimentos do veículo na janela — é a única leitura de hodômetro que existe hoje
   * sem a integração de rastreamento real conectada.
   */
  async custoPorVeiculo(empresaId: string, de: Date, ate: Date, veiculoId?: string) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { empresaId, arquivadoEm: null, ...(veiculoId ? { id: veiculoId } : {}) },
      orderBy: { placa: 'asc' },
    });

    return Promise.all(
      veiculos.map(async (veiculo) => {
        const [custoCombustivel, custoManutencao, hodometros] = await Promise.all([
          this.prisma.abastecimento.aggregate({
            where: { veiculoId: veiculo.id, data: { gte: de, lte: ate } },
            _sum: { valor: true },
          }),
          this.prisma.manutencao.aggregate({
            where: { veiculoId: veiculo.id, status: StatusManutencao.CONCLUIDA, concluidoEm: { gte: de, lte: ate } },
            _sum: { custo: true },
          }),
          this.prisma.abastecimento.aggregate({
            where: { veiculoId: veiculo.id, data: { gte: de, lte: ate } },
            _min: { hodometro: true },
            _max: { hodometro: true },
          }),
        ]);

        const custo = (custoCombustivel._sum.valor ?? 0) + (custoManutencao._sum.custo ?? 0);
        const kmRodado = Math.max((hodometros._max.hodometro ?? 0) - (hodometros._min.hodometro ?? 0), 0);

        return {
          veiculoId: veiculo.id,
          placa: veiculo.placa,
          km: kmRodado,
          custo,
          custoPorKm: kmRodado > 0 ? Math.round((custo / kmRodado) * 100) / 100 : null,
        };
      }),
    );
  }
}
