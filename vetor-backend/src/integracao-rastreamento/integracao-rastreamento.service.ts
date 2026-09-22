import { Injectable } from '@nestjs/common';
import { StatusIntegracaoRastreamento } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegracaoRastreamentoService {
  constructor(private prisma: PrismaService) {}

  async status(empresaId: string) {
    const integracao = await this.prisma.integracaoRastreamento.findUnique({ where: { empresaId } });
    return (
      integracao ?? {
        empresaId,
        status: StatusIntegracaoRastreamento.SEM,
        tokenCauda: null,
        conectadoEm: null,
      }
    );
  }

  async conectar(empresaId: string, token: string) {
    const tokenHash = await bcrypt.hash(token, 10);
    const tokenCauda = token.slice(-4);
    return this.prisma.integracaoRastreamento.upsert({
      where: { empresaId },
      create: { empresaId, status: StatusIntegracaoRastreamento.CONECTADO, tokenHash, tokenCauda, conectadoEm: new Date() },
      update: { status: StatusIntegracaoRastreamento.CONECTADO, tokenHash, tokenCauda, conectadoEm: new Date() },
    });
  }

  async testar(empresaId: string) {
    const integracao = await this.prisma.integracaoRastreamento.findUnique({ where: { empresaId } });
    if (!integracao || integracao.status !== StatusIntegracaoRastreamento.CONECTADO) {
      return { ok: false, mensagem: 'Nenhum token conectado.' };
    }
    // Fora de escopo por decisão consciente (22/09/2026): sem credencial real de terceiro
    // disponível pra este portfólio. A chamada real à API entraria aqui. Ver PENDENCIAS_DEPLOY.txt #4.
    return { ok: true, mensagem: 'Conexão OK.' };
  }

  async remover(empresaId: string): Promise<void> {
    await this.prisma.integracaoRastreamento.updateMany({
      where: { empresaId },
      data: { status: StatusIntegracaoRastreamento.SEM, tokenHash: null, tokenCauda: null, conectadoEm: null },
    });
  }
}
