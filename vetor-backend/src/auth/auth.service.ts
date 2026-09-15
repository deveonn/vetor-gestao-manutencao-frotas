import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Papel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { JwtPayload } from '../common/types/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';

type UsuarioComMotorista = {
  id: string;
  papel: Papel;
  empresaId: string | null;
  email: string | null;
  usuario: string | null;
  motoristaId: string | null;
  motorista: { id: string; nome: string } | null;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(login: string, senha: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { ativo: true, OR: [{ email: login }, { usuario: login }] },
      include: { motorista: true },
    });
    if (!usuario) throw new UnauthorizedException('Credenciais inválidas.');

    const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaOk) throw new UnauthorizedException('Credenciais inválidas.');

    const tokens = await this.emitirTokens(usuario);
    return { ...tokens, usuario: this.paraPublico(usuario) };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: { include: { motorista: true } } },
    });
    if (!registro || registro.revogadoEm || registro.expiraEm < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    // rotação: revoga o token usado e emite um par novo
    await this.prisma.refreshToken.update({ where: { id: registro.id }, data: { revogadoEm: new Date() } });
    const tokens = await this.emitirTokens(registro.usuario);
    return { ...tokens, usuario: this.paraPublico(registro.usuario) };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }

  async me(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      include: { motorista: true },
    });
    return this.paraPublico(usuario);
  }

  private async emitirTokens(usuario: UsuarioComMotorista) {
    const payload: JwtPayload = {
      sub: usuario.id,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
      motoristaId: usuario.motoristaId,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as JwtSignOptions['expiresIn'],
    });

    const refreshToken = randomBytes(48).toString('hex');
    const dias = this.parseDias(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'));
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + dias);

    await this.prisma.refreshToken.create({
      data: { usuarioId: usuario.id, tokenHash: hashToken(refreshToken), expiraEm },
    });

    return { accessToken, refreshToken };
  }

  private parseDias(valor: string): number {
    const match = /^(\d+)d$/.exec(valor);
    return match ? Number(match[1]) : 30;
  }

  private paraPublico(usuario: UsuarioComMotorista) {
    return {
      id: usuario.id,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
      nome: usuario.motorista?.nome ?? usuario.email ?? usuario.usuario,
      login: usuario.email ?? usuario.usuario,
    };
  }
}
