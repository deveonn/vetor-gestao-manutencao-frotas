import { Severidade } from '@prisma/client';
import { compararSituacao, situacaoManutencao } from '../src/manutencoes/situacao';

const base = { kmAlvo: null, dataLimite: null, kmRestante: null, nivel: null, prazo: null };
// "hoje" fixo: 07/10/2026 12:00 em Brasília (15:00 UTC)
const agora = new Date('2026-10-07T15:00:00Z');
const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('situacaoManutencao', () => {
  it('só por km: restante = meta - hodômetro; > 1.500 km é ok', () => {
    expect(situacaoManutencao({ ...base, kmAlvo: 12000 }, 10000, agora)).toEqual({
      kmRestante: 2000, diasRestantes: null, nivel: Severidade.OK, prazo: 'em 2.000 km',
    });
  });

  it('até 1.500 km é atenção (a faixa do seed)', () => {
    expect(situacaoManutencao({ ...base, kmAlvo: 11500 }, 10000, agora).nivel).toBe(Severidade.ATENCAO);
    expect(situacaoManutencao({ ...base, kmAlvo: 11501 }, 10000, agora).nivel).toBe(Severidade.OK);
  });

  it('passou da meta de km é crítico, com "vencida há X km"', () => {
    const s = situacaoManutencao({ ...base, kmAlvo: 9660 }, 10000, agora);
    expect(s).toMatchObject({ kmRestante: -340, nivel: Severidade.CRITICO, prazo: 'vencida há 340 km' });
  });

  it('meta exatamente no hodômetro: "vence agora", atenção', () => {
    expect(situacaoManutencao({ ...base, kmAlvo: 10000 }, 10000, agora)).toMatchObject({ prazo: 'vence agora', nivel: Severidade.ATENCAO });
  });

  it('só por data: dias de calendário no fuso de Brasília', () => {
    expect(situacaoManutencao({ ...base, dataLimite: dia('2026-10-17') }, 0, agora)).toMatchObject({
      kmRestante: null, diasRestantes: 10, nivel: Severidade.ATENCAO, prazo: 'em 10 dias',
    });
    expect(situacaoManutencao({ ...base, dataLimite: dia('2026-11-30') }, 0, agora).nivel).toBe(Severidade.OK);
    expect(situacaoManutencao({ ...base, dataLimite: dia('2026-10-08') }, 0, agora).prazo).toBe('em 1 dia');
  });

  it('data de hoje: "vence hoje"; data passada: crítico', () => {
    expect(situacaoManutencao({ ...base, dataLimite: dia('2026-10-07') }, 0, agora).prazo).toBe('vence hoje');
    expect(situacaoManutencao({ ...base, dataLimite: dia('2026-10-04') }, 0, agora)).toMatchObject({
      nivel: Severidade.CRITICO, prazo: 'vencida há 3 dias',
    });
  });

  it('às 23h de Brasília ainda é "hoje" (UTC já virou o dia)', () => {
    const noite = new Date('2026-10-08T02:00:00Z'); // 07/10 23:00 em Brasília
    expect(situacaoManutencao({ ...base, dataLimite: dia('2026-10-07') }, 0, noite).prazo).toBe('vence hoje');
  });

  it('km e data: vence no que chegar primeiro; o texto mostra os dois', () => {
    const s = situacaoManutencao({ ...base, kmAlvo: 10850, dataLimite: dia('2026-10-19') }, 10000, agora);
    expect(s).toMatchObject({ kmRestante: 850, diasRestantes: 12, nivel: Severidade.ATENCAO, prazo: 'em 850 km ou 12 dias' });
    // km longe, data vencida -> crítico pela data
    expect(situacaoManutencao({ ...base, kmAlvo: 20000, dataLimite: dia('2026-10-01') }, 10000, agora).nivel).toBe(Severidade.CRITICO);
  });

  it('pendência antiga sem meta usa os valores gravados', () => {
    expect(situacaoManutencao({ ...base, kmRestante: 500, nivel: Severidade.ATENCAO, prazo: 'em 500 km' }, 99999, agora)).toEqual({
      kmRestante: 500, diasRestantes: null, nivel: Severidade.ATENCAO, prazo: 'em 500 km',
    });
  });
});

describe('compararSituacao', () => {
  it('ordena crítico, atenção, ok; dentro do nível, o que vence antes', () => {
    const lista = [
      situacaoManutencao({ ...base, kmAlvo: 13000 }, 10000, agora), // ok 3000
      situacaoManutencao({ ...base, kmAlvo: 11400 }, 10000, agora), // atenção 1400
      situacaoManutencao({ ...base, kmAlvo: 9000 }, 10000, agora), // crítico
      situacaoManutencao({ ...base, kmAlvo: 10200 }, 10000, agora), // atenção 200
    ].sort(compararSituacao);
    expect(lista.map((s) => s.kmRestante)).toEqual([-1000, 200, 1400, 3000]);
  });
});
