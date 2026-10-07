import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusManutencao, StatusVeiculo, TipoVeiculo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { CreateVinculoDto } from './dto/create-vinculo.dto';
import { comEstado } from './estado';

/** Pendências entram pra calcular o km até a troca de óleo (ver estado.ts). */
const PENDENTES = { manutencoes: { where: { status: StatusManutencao.PENDENTE } } } as const;

/**
 * Posições de pneu por tipo — mesmas labels do app mobile (VEHICLE_TIRE_POSITIONS), que é quem manda as vistorias.
 * Caminhão leve tem traseiro duplo (ver enum TipoVeiculo no schema).
 */
const POSICOES_PNEU: Record<TipoVeiculo, string[]> = {
  UTILITARIO: ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo', 'traseiro direito'],
  VAN_CARGA: ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo', 'traseiro direito'],
  CAMINHAO_LEVE: [
    'dianteiro esquerdo', 'dianteiro direito',
    'traseiro esquerdo interno', 'traseiro esquerdo externo',
    'traseiro direito interno', 'traseiro direito externo',
  ],
};

@Injectable()
export class VeiculosService {
  constructor(private prisma: PrismaService) {}

  async listar(empresaId: string) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { empresaId, arquivadoEm: null },
      include: { pneus: true, motoristaAtual: true, ...PENDENTES },
      orderBy: { placa: 'asc' },
    });
    return veiculos.map(comEstado);
  }

  async criar(empresaId: string, dto: CreateVeiculoDto) {
    const veiculo = await this.prisma.veiculo.create({
      data: { empresaId, placa: dto.placa.toUpperCase(), modelo: dto.modelo ?? '—', tipo: dto.tipo },
    });
    await this.prisma.pneuPosicao.createMany({
      data: POSICOES_PNEU[dto.tipo].map((posicao) => ({ veiculoId: veiculo.id, posicao })),
    });
    return this.buscar(empresaId, veiculo.id);
  }

  async buscar(empresaId: string, id: string) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: { id, empresaId },
      include: { pneus: true, motoristaAtual: true, ...PENDENTES },
    });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    return comEstado(veiculo);
  }

  /** Na oficina = status "em manutenção" (fora da conta de disponíveis); ao sair, volta ao calculado. */
  async definirOficina(empresaId: string, id: string, naOficina: boolean) {
    await this.buscar(empresaId, id);
    await this.prisma.veiculo.update({
      where: { id },
      data: { status: naOficina ? StatusVeiculo.MANUTENCAO : StatusVeiculo.PARADO },
    });
    return this.buscar(empresaId, id);
  }

  /** Soft-delete — a cópia do mock promete arquivamento de 90 dias antes da exclusão definitiva. */
  async arquivar(empresaId: string, id: string): Promise<void> {
    await this.buscar(empresaId, id);
    await this.prisma.veiculo.update({ where: { id }, data: { arquivadoEm: new Date() } });
  }

  async vinculos(empresaId: string, id: string) {
    await this.buscar(empresaId, id);
    return this.prisma.vinculoMotoristaVeiculo.findMany({
      where: { veiculoId: id },
      include: { motorista: true },
      orderBy: { de: 'desc' },
    });
  }

  /** Encerra o vínculo aberto atual (se houver) e cria um novo, atualizando o motorista atual do veículo. */
  async criarVinculo(empresaId: string, veiculoId: string, dto: CreateVinculoDto) {
    await this.buscar(empresaId, veiculoId);
    const motorista = await this.prisma.motorista.findFirst({ where: { id: dto.motoristaId, empresaId } });
    if (!motorista) throw new NotFoundException('Motorista não encontrado.');

    const agora = new Date();
    const [, vinculo] = await this.prisma.$transaction([
      this.prisma.vinculoMotoristaVeiculo.updateMany({
        where: { veiculoId, ate: null },
        data: { ate: agora },
      }),
      this.prisma.vinculoMotoristaVeiculo.create({
        data: { veiculoId, motoristaId: dto.motoristaId, de: agora },
        include: { motorista: true },
      }),
      this.prisma.veiculo.update({
        where: { id: veiculoId },
        data: { motoristaAtualId: dto.motoristaId },
      }),
    ]);

    return vinculo;
  }

  async veiculoDoDia(empresaId: string, motoristaId: string) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: { empresaId, motoristaAtualId: motoristaId, arquivadoEm: null },
      include: { pneus: true },
    });
    if (!veiculo) throw new NotFoundException('Nenhum veículo vinculado a você hoje.');
    return veiculo;
  }
}
