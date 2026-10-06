import { Severidade } from '@prisma/client';

/** Faltando até isso já é "atenção" (mesmas faixas que o seed usava). Passou da meta = "crítico". */
export const KM_ATENCAO = 1500;
export const DIAS_ATENCAO = 15;

const DIA_MS = 24 * 60 * 60 * 1000;
const km = (n: number) => n.toLocaleString('pt-BR');

export interface SituacaoManutencao {
  kmRestante: number | null;
  diasRestantes: number | null;
  nivel: Severidade;
  prazo: string;
}

/** Dias de calendário até `limite` (coluna DATE, meia-noite UTC), contando "hoje" no fuso de Brasília. */
function diasAte(limite: Date, agora: Date): number {
  const hoje = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // UTC-3
  const hojeUtc = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return Math.round((limite.getTime() - hojeUtc) / DIA_MS);
}

/**
 * Km restante, urgência e prazo de uma manutenção pendente, calculados agora a partir da meta (kmAlvo e/ou
 * dataLimite) e do hodômetro atual do veículo. Pendência antiga sem meta usa os valores que foram gravados.
 */
export function situacaoManutencao(
  m: { kmAlvo: number | null; dataLimite: Date | null; kmRestante: number | null; nivel: Severidade | null; prazo: string | null },
  hodometro: number,
  agora = new Date(),
): SituacaoManutencao {
  if (m.kmAlvo == null && m.dataLimite == null) {
    return { kmRestante: m.kmRestante, diasRestantes: null, nivel: m.nivel ?? Severidade.OK, prazo: m.prazo ?? '—' };
  }
  const kmRestante = m.kmAlvo != null ? m.kmAlvo - hodometro : null;
  const diasRestantes = m.dataLimite ? diasAte(m.dataLimite, agora) : null;

  const vencidaKm = kmRestante != null && kmRestante < 0;
  const vencidaData = diasRestantes != null && diasRestantes < 0;
  let nivel: Severidade = Severidade.OK;
  if (vencidaKm || vencidaData) nivel = Severidade.CRITICO;
  else if ((kmRestante != null && kmRestante <= KM_ATENCAO) || (diasRestantes != null && diasRestantes <= DIAS_ATENCAO)) {
    nivel = Severidade.ATENCAO;
  }

  let prazo: string;
  if (vencidaKm) prazo = `vencida há ${km(-kmRestante!)} km`;
  else if (vencidaData) prazo = `vencida há ${-diasRestantes!} ${-diasRestantes! === 1 ? 'dia' : 'dias'}`;
  else if (kmRestante === 0) prazo = 'vence agora';
  else if (diasRestantes === 0) prazo = 'vence hoje';
  else {
    // "em 850 km ou 12 dias" / "em 850 km" / "em 12 dias"
    const dias = diasRestantes != null ? `${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}` : null;
    prazo = kmRestante != null ? `em ${km(kmRestante)} km${dias ? ` ou ${dias}` : ''}` : `em ${dias}`;
  }
  return { kmRestante, diasRestantes, nivel, prazo };
}

/** Ordem da lista: crítico, atenção, ok; dentro do nível, o que vence antes (km, depois dias) primeiro. */
export function compararSituacao(a: SituacaoManutencao, b: SituacaoManutencao): number {
  const peso = (n: Severidade) => (n === Severidade.CRITICO ? 0 : n === Severidade.ATENCAO ? 1 : 2);
  return (
    peso(a.nivel) - peso(b.nivel) ||
    (a.kmRestante ?? Infinity) - (b.kmRestante ?? Infinity) ||
    (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity)
  );
}
