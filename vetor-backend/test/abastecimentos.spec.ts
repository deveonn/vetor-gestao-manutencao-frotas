import { NotFoundException } from '@nestjs/common';
import { AbastecimentosService } from '../src/abastecimentos/abastecimentos.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Prisma simulado: só o que AbastecimentosService.criar usa. */
function cenario(opts: { hodometroVeiculo?: number; anterior?: { hodometro: number } | null; ultimosKmL?: number[]; veiculoExiste?: boolean }) {
  const prisma = {
    veiculo: {
      findFirst: jest.fn().mockResolvedValue(opts.veiculoExiste === false ? null : { id: 'v1', hodometro: opts.hodometroVeiculo ?? 10000 }),
      update: jest.fn().mockResolvedValue({}),
    },
    fornecedor: { findFirst: jest.fn().mockResolvedValue({ id: 'f1' }) },
    abastecimento: {
      findFirst: jest.fn().mockResolvedValue(opts.anterior ?? null),
      findMany: jest.fn().mockResolvedValue((opts.ultimosKmL ?? []).map((kmL) => ({ kmL }))),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
  };
  return { prisma, service: new AbastecimentosService(prisma as unknown as PrismaService) };
}
const dto = (hodometro: number, litros = 40) => ({ veiculoId: 'v1', fornecedorId: 'f1', litros, valor: 250, hodometro });

describe('AbastecimentosService.criar', () => {
  it('km/L = km rodado desde o abastecimento anterior ÷ litros, com 1 casa', async () => {
    const { service } = cenario({ anterior: { hodometro: 10000 }, ultimosKmL: [9.5, 9.8] });
    const a = await service.criar('e1', dto(10380, 40));
    expect(a.kmL).toBe(9.5);
    expect(a.anomalo).toBe(false);
  });

  it('primeiro abastecimento do veículo: sem km/L e sem anomalia', async () => {
    const { service } = cenario({ anterior: null });
    expect(await service.criar('e1', dto(10000))).toMatchObject({ kmL: null, anomalo: false });
  });

  it('abaixo de 80% da média das últimas leituras é anômalo', async () => {
    // média 10 -> limite 8; 300 km / 40 L = 7,5
    const { service } = cenario({ anterior: { hodometro: 10000 }, ultimosKmL: [10, 10, 10] });
    expect(await service.criar('e1', dto(10300, 40))).toMatchObject({ kmL: 7.5, anomalo: true });
  });

  it('exatamente na fronteira (80%) não é anômalo', async () => {
    const { service } = cenario({ anterior: { hodometro: 10000 }, ultimosKmL: [10] });
    expect(await service.criar('e1', dto(10320, 40))).toMatchObject({ kmL: 8, anomalo: false });
  });

  it('atualiza hodômetro e km/L do veículo', async () => {
    const { prisma, service } = cenario({ hodometroVeiculo: 10000, anterior: { hodometro: 10000 } });
    await service.criar('e1', dto(10400, 40));
    expect(prisma.veiculo.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { hodometro: 10400, kmL: 10 } });
  });

  it('lançamento retroativo (hodômetro abaixo do atual) não faz o veículo voltar no tempo', async () => {
    const { prisma, service } = cenario({ hodometroVeiculo: 20000, anterior: { hodometro: 9000 } });
    await service.criar('e1', dto(9400, 40));
    expect(prisma.veiculo.update).not.toHaveBeenCalled();
  });

  it('veículo de outra empresa (ou inexistente): 404 — a busca é sempre por empresaId', async () => {
    const { prisma, service } = cenario({ veiculoExiste: false });
    await expect(service.criar('e1', dto(10000))).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.veiculo.findFirst).toHaveBeenCalledWith({ where: { id: 'v1', empresaId: 'e1' } });
    expect(prisma.abastecimento.create).not.toHaveBeenCalled();
  });
});
