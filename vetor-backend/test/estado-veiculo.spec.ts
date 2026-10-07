import { Manutencao, StatusManutencao, StatusVeiculo } from '@prisma/client';
import { kmParaTroca, statusVeiculo } from '../src/veiculos/estado';

const manut = (item: string, kmAlvo: number | null, status: StatusManutencao = StatusManutencao.PENDENTE) =>
  ({ item, kmAlvo, status, dataLimite: null, kmRestante: null, nivel: null, prazo: null }) as Manutencao;

describe('statusVeiculo', () => {
  it('na oficina (MANUTENCAO gravado) vale sempre', () => {
    expect(statusVeiculo({ status: StatusVeiculo.MANUTENCAO, motoristaAtualId: 'm1' })).toBe(StatusVeiculo.MANUTENCAO);
  });
  it('com motorista vinculado: rodando; sem: parado (o gravado RODANDO/PARADO é ignorado)', () => {
    expect(statusVeiculo({ status: StatusVeiculo.PARADO, motoristaAtualId: 'm1' })).toBe(StatusVeiculo.RODANDO);
    expect(statusVeiculo({ status: StatusVeiculo.RODANDO, motoristaAtualId: null })).toBe(StatusVeiculo.PARADO);
  });
});

describe('kmParaTroca', () => {
  it('pega a troca de óleo pendente que vence antes', () => {
    expect(kmParaTroca(10000, [manut('Troca de óleo e filtro', 15000), manut('Troca de oleo', 11200)])).toBe(1200);
  });
  it('ignora outros serviços, concluídas e troca só por data', () => {
    expect(kmParaTroca(10000, [
      manut('Pastilhas de freio', 10500),
      manut('Troca de óleo e filtro', 10300, StatusManutencao.CONCLUIDA),
      manut('Troca de óleo e filtro', null),
    ])).toBeNull();
  });
  it('vencida dá negativo', () => {
    expect(kmParaTroca(10000, [manut('Troca de óleo e filtro', 9660)])).toBe(-340);
  });
});
