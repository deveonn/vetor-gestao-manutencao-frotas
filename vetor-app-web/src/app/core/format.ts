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
