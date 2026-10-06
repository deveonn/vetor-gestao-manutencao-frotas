import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Papel, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AcessoMotoristaDto } from './dto/acesso-motorista.dto';
import { CreateMotoristaDto } from './dto/create-motorista.dto';

/** Só o login do app — nunca o hash da senha. */
const ACESSO = { usuario: { select: { usuario: true } } } as const;

/** Login já usado (Usuario.usuario é único em todo o sistema, não só na empresa). */
function usuarioEmUso(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

@Injectable()
export class MotoristasService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.motorista.findMany({
      where: { empresaId },
      include: {
        // veículo arquivado mantém motoristaAtualId, mas não conta mais como vínculo ativo
        veiculoAtual: { where: { arquivadoEm: null } },
        // vínculos abertos, pra exibir o "vínculo desde" do veículo atual
        vinculos: { where: { ate: null, veiculo: { arquivadoEm: null } }, orderBy: { de: 'desc' } },
        ...ACESSO,
      },
      orderBy: { nome: 'asc' },
    });
  }

  /** Cadastra o motorista e, se vierem usuario + senha, o acesso dele ao app na mesma transação. */
  async criar(empresaId: string, dto: CreateMotoristaDto) {
    if (!!dto.usuario !== !!dto.senha) {
      throw new BadRequestException('Informe usuário e senha juntos (ou nenhum dos dois).');
    }
    try {
      return await this.prisma.motorista.create({
        data: {
          empresaId,
          nome: dto.nome,
          categoriaCnh: dto.categoriaCnh,
          validadeCnh: dto.validadeCnh ? new Date(dto.validadeCnh) : null,
          ...(dto.usuario && dto.senha
            ? {
                usuario: {
                  create: {
                    papel: Papel.MOTORISTA,
                    usuario: dto.usuario,
                    senhaHash: await bcrypt.hash(dto.senha, 10),
                    empresaId,
                  },
                },
              }
            : {}),
        },
        include: ACESSO,
      });
    } catch (err) {
      if (usuarioEmUso(err)) throw new ConflictException('Esse usuário já está em uso — escolha outro.');
      throw err;
    }
  }

  /**
   * Cria o acesso ao app (motorista sem login — precisa de usuario) ou redefine a senha (e, se vier, o usuario).
   * Redefinir encerra as sessões abertas: o celular perde o refresh token e pede login com a senha nova.
   */
  async definirAcesso(empresaId: string, id: string, dto: AcessoMotoristaDto) {
    const motorista = await this.prisma.motorista.findFirst({ where: { id, empresaId }, include: { usuario: true } });
    if (!motorista) throw new NotFoundException('Motorista não encontrado.');
    const senhaHash = await bcrypt.hash(dto.senha, 10);

    try {
      if (!motorista.usuario) {
        if (!dto.usuario) throw new BadRequestException('Informe o usuário pra criar o acesso ao app.');
        await this.prisma.usuario.create({
          data: { papel: Papel.MOTORISTA, usuario: dto.usuario, senhaHash, empresaId, motoristaId: id },
        });
      } else {
        await this.prisma.$transaction([
          this.prisma.usuario.update({
            where: { id: motorista.usuario.id },
            data: { senhaHash, ...(dto.usuario ? { usuario: dto.usuario } : {}) },
          }),
          this.prisma.refreshToken.updateMany({
            where: { usuarioId: motorista.usuario.id, revogadoEm: null },
            data: { revogadoEm: new Date() },
          }),
        ]);
      }
    } catch (err) {
      if (usuarioEmUso(err)) throw new ConflictException('Esse usuário já está em uso — escolha outro.');
      throw err;
    }
    return this.prisma.motorista.findUnique({ where: { id }, include: ACESSO });
  }
}
