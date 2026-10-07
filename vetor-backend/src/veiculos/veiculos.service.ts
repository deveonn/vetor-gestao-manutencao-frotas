import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusManutencao, StatusVeiculo, TipoVeiculo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { CreateVinculoDto } from './dto/create-vinculo.dto';
import { UpdateVeiculoDto } from './dto/update-veiculo.dto';
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

  /**
   * Cadastra o veículo. Se a placa é de um veículo ARQUIVADO da empresa, reativa ele (decisão de 07/10/2026): o
   * histórico — abastecimentos, manutenções, vistorias, vínculos — volta junto, e modelo/tipo são os informados agora.
   * Volta sem motorista (o vínculo foi encerrado ao arquivar). Placa de veículo ativo continua 409.
   */
  async criar(empresaId: string, dto: CreateVeiculoDto) {
    const placa = dto.placa.trim().toUpperCase();
    const arquivado = await this.prisma.veiculo.findFirst({ where: { empresaId, placa, arquivadoEm: { not: null } } });
    if (arquivado) {
      await this.prisma.veiculo.update({
        where: { id: arquivado.id },
        data: {
          arquivadoEm: null,
          status: StatusVeiculo.PARADO,
          motoristaAtualId: null,
          ...(dto.modelo?.trim() ? { modelo: dto.modelo.trim() } : {}),
          tipo: dto.tipo,
        },
      });
      await this.ajustarPneus(arquivado.id, dto.tipo);
      return { ...(await this.buscar(empresaId, arquivado.id)), reativado: true };
    }
    const veiculo = await this.prisma.veiculo.create({
      data: { empresaId, placa, modelo: dto.modelo?.trim() || '—', tipo: dto.tipo },
    });
    await this.ajustarPneus(veiculo.id, dto.tipo);
    return this.buscar(empresaId, veiculo.id);
  }

  /**
   * Deixa as posições de pneu no diagrama do tipo (caminhão leve tem traseiro duplo): as que existem nos dois ficam
   * (com severidade e observação), as que sobram saem, as que faltam nascem OK.
   */
  private async ajustarPneus(veiculoId: string, tipo: TipoVeiculo) {
    const novas = POSICOES_PNEU[tipo];
    const existentes = (await this.prisma.pneuPosicao.findMany({ where: { veiculoId } })).map((p) => p.posicao);
    await this.prisma.$transaction([
      this.prisma.pneuPosicao.deleteMany({ where: { veiculoId, posicao: { notIn: novas } } }),
      this.prisma.pneuPosicao.createMany({
        data: novas.filter((p) => !existentes.includes(p)).map((posicao) => ({ veiculoId, posicao })),
      }),
    ]);
  }

  async buscar(empresaId: string, id: string) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: { id, empresaId },
      include: { pneus: true, motoristaAtual: true, ...PENDENTES },
    });
    if (!veiculo) throw new NotFoundException('Veículo não encontrado.');
    return comEstado(veiculo);
  }

  /**
   * Edita placa, modelo e tipo. Mudar o tipo ajusta as posições de pneu ao novo diagrama (caminhão leve tem traseiro
   * duplo): posições que existem nos dois tipos mantêm severidade e observação; as que sobram saem, as novas nascem OK.
   */
  async atualizar(empresaId: string, id: string, dto: UpdateVeiculoDto) {
    const atual = await this.prisma.veiculo.findFirst({ where: { id, empresaId, arquivadoEm: null } });
    if (!atual) throw new NotFoundException('Veículo não encontrado.');
    try {
      await this.prisma.veiculo.update({
        where: { id },
        data: {
          ...(dto.placa !== undefined ? { placa: dto.placa.trim().toUpperCase() } : {}),
          ...(dto.modelo !== undefined ? { modelo: dto.modelo.trim() || '—' } : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Já existe um veículo com essa placa (ativo ou arquivado).');
      }
      throw err;
    }
    if (dto.tipo && dto.tipo !== atual.tipo) await this.ajustarPneus(id, dto.tipo);
    return this.buscar(empresaId, id);
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

  /** Soft-delete. Encerra o vínculo com o motorista (antes o veículo arquivado ficava "preso" a ele). */
  async arquivar(empresaId: string, id: string): Promise<void> {
    await this.buscar(empresaId, id);
    const agora = new Date();
    await this.prisma.$transaction([
      this.prisma.veiculo.update({ where: { id }, data: { arquivadoEm: agora, motoristaAtualId: null } }),
      this.prisma.vinculoMotoristaVeiculo.updateMany({ where: { veiculoId: id, ate: null }, data: { ate: agora } }),
    ]);
  }

  async vinculos(empresaId: string, id: string) {
    await this.buscar(empresaId, id);
    return this.prisma.vinculoMotoristaVeiculo.findMany({
      where: { veiculoId: id },
      include: { motorista: true },
      orderBy: { de: 'desc' },
    });
  }

  /**
   * Encerra o vínculo aberto do veículo (se houver) e o vínculo aberto do MOTORISTA com outro veículo — um motorista
   * dirige um veículo por vez (o app pega o "veículo do dia" por ele) — e cria o novo.
   */
  async criarVinculo(empresaId: string, veiculoId: string, dto: CreateVinculoDto) {
    await this.buscar(empresaId, veiculoId);
    const motorista = await this.prisma.motorista.findFirst({ where: { id: dto.motoristaId, empresaId, arquivadoEm: null } });
    if (!motorista) throw new NotFoundException('Motorista não encontrado.');

    const agora = new Date();
    const [, , vinculo] = await this.prisma.$transaction([
      this.prisma.vinculoMotoristaVeiculo.updateMany({
        where: { ate: null, OR: [{ veiculoId }, { motoristaId: dto.motoristaId }] },
        data: { ate: agora },
      }),
      // o veículo que ele dirigia até agora fica sem motorista
      this.prisma.veiculo.updateMany({
        where: { empresaId, motoristaAtualId: dto.motoristaId, id: { not: veiculoId } },
        data: { motoristaAtualId: null },
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
