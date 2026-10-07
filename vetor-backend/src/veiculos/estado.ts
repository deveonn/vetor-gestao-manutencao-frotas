import { Manutencao, StatusManutencao, StatusVeiculo, Veiculo } from '@prisma/client';
import { situacaoManutencao } from '../manutencoes/situacao';

/** Manutenção pendente que conta como "troca de óleo" pro indicador do veículo. */
const TROCA_DE_OLEO = /[óo]leo/i;

/**
 * Status de operação, calculado (sem rastreamento não há telemetria):
 * - MANUTENCAO: o gestor marcou o veículo como na oficina (PATCH /veiculos/:id/oficina) — é o único valor da
 *   coluna `status` que ainda vale; manutenção vencida NÃO tira o veículo de circulação sozinha;
 * - RODANDO: tem motorista vinculado;
 * - PARADO: sem motorista.
 */
export function statusVeiculo(v: Pick<Veiculo, 'status' | 'motoristaAtualId'>): StatusVeiculo {
  if (v.status === StatusVeiculo.MANUTENCAO) return StatusVeiculo.MANUTENCAO;
  return v.motoristaAtualId ? StatusVeiculo.RODANDO : StatusVeiculo.PARADO;
}

/**
 * Km até a próxima troca de óleo = a troca de óleo pendente que vence antes (meta x hodômetro atual).
 * null = nenhuma troca de óleo agendada por km.
 */
export function kmParaTroca(hodometro: number, manutencoes: Manutencao[]): number | null {
  const restantes = manutencoes
    .filter((m) => m.status === StatusManutencao.PENDENTE && TROCA_DE_OLEO.test(m.item))
    .map((m) => situacaoManutencao(m, hodometro).kmRestante)
    .filter((km): km is number => km != null);
  return restantes.length ? Math.min(...restantes) : null;
}

/** Veículo como a API devolve: status e km até a troca calculados no lugar dos valores gravados. */
export function comEstado<T extends Veiculo & { manutencoes?: Manutencao[] }>(v: T) {
  const { manutencoes, ...resto } = v;
  return { ...resto, status: statusVeiculo(v), kmParaTroca: kmParaTroca(v.hodometro, manutencoes ?? []) };
}
