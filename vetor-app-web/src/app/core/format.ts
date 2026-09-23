const nf = new Intl.NumberFormat('pt-BR');

/** Inteiro formatado pt-BR, ex.: 121480 -> "121.480" */
export function fmt(n: number): string {
  return nf.format(n);
}

/** Decimal com vírgula, ex.: 9.4 -> "9,4" */
export function dec(n: number | string): string {
  return String(n).replace('.', ',');
}

/** Moeda pt-BR arredondada, ex.: 18462 -> "R$ 18.462" */
export function money(n: number): string {
  return 'R$ ' + nf.format(Math.round(n));
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Data curta pt-BR, ex.: "2026-03-04T..." -> "04 mar 2026" */
export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Mês/ano pt-BR, ex.: "2024-08-12T..." -> "ago 2024" */
export function mesAno(iso: string): string {
  const d = new Date(iso);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Dia e mês pt-BR, ex.: "2026-07-19T..." -> "19 jul" */
export function diaMes(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** Semana vinda da API como meia-noite UTC — lê em UTC pra não virar o domingo anterior no Brasil. */
export function diaMesUtc(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
