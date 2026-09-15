import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';

const POSICOES_PADRAO = ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo', 'traseiro direito'];

@Injectable()
export class VeiculosService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.veiculo.findMany({
      where: { empresaId, arquivadoEm: null },
      include: { pneus: true, motoristaAtual: true },
      orderBy: { placa: 'asc' },
    });
  }

  async criar(empresaId: string, dto: CreateVeiculoDto) {
    const veiculo = await this.prisma.veiculo.create({
      data: { empresaId, placa: dto.placa.toUpperCase(), modelo: dto.modelo ?? '—', tipo: dto.tipo },
    });
    await this.prisma.pneuPosicao.createMany({
      data: POSICOES_PADRAO.map((posicao) => ({ veiculoId: veiculo.id, posicao })),
    });
    return this.buscar(empresaId, veiculo.id);
  }

  async buscar(empresaId: string, id: string) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: { id, empresaId },
      include: { pneus: true, motoristaAtual: true },
    });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    return veiculo;
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

  async veiculoDoDia(empresaId: string, motoristaId: string) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: { empresaId, motoristaAtualId: motoristaId, arquivadoEm: null },
      include: { pneus: true },
    });
    if (!veiculo) throw new NotFoundException('Nenhum veículo vinculado a você hoje.');
    return veiculo;
  }
}
