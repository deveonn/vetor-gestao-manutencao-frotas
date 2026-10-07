import { Injectable } from '@nestjs/common';
import { Severidade } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PneusService {
  constructor(private prisma: PrismaService) {}

  /**
   * Pneus fora do OK na frota ativa. O estado por posição (PneuPosicao) é atualizado a cada vistoria
   * (ver vistorias.service.ts); a vistoria mais recente daquela posição dá a data e, se o pneu não tiver
   * observação própria, a observação do motorista. Críticos primeiro, depois os mais recentes.
   */
  async sinalizados(empresaId: string) {
    const pneus = await this.prisma.pneuPosicao.findMany({
      where: { severidade: { not: Severidade.OK }, veiculo: { empresaId, arquivadoEm: null } },
      include: { veiculo: { select: { id: true, placa: true } } },
    });

    const resultado = await Promise.all(
      pneus.map(async (p) => {
        const item = await this.prisma.vistoriaItem.findFirst({
          where: { stepId: 'pneus', label: p.posicao, vistoria: { veiculoId: p.veiculoId } },
          include: { vistoria: { select: { iniciadoEm: true } }, midia: { select: { url: true } } },
          orderBy: { vistoria: { iniciadoEm: 'desc' } },
        });
        return {
          veiculo: p.veiculo,
          posicao: p.posicao,
          severidade: p.severidade,
          observacao: p.observacao ?? item?.observacao ?? null,
          vistoriaEm: item?.vistoria.iniciadoEm ?? null,
          // foto tirada no app (R2 em produção: URL absoluta; disco em dev: /uploads/... relativo à API)
          fotoUrl: item?.midia?.url ?? null,
        };
      }),
    );

    const peso = (s: Severidade) => (s === Severidade.CRITICO ? 0 : 1);
    return resultado.sort(
      (a, b) =>
        peso(a.severidade) - peso(b.severidade) ||
        (b.vistoriaEm?.getTime() ?? 0) - (a.vistoriaEm?.getTime() ?? 0),
    );
  }
}
