import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AbastecimentosModule } from './abastecimentos/abastecimentos.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validarAmbiente } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmpresasModule } from './empresas/empresas.module';
import { FornecedoresModule } from './fornecedores/fornecedores.module';
import { IntegracaoRastreamentoModule } from './integracao-rastreamento/integracao-rastreamento.module';
import { ManutencoesModule } from './manutencoes/manutencoes.module';
import { MidiaModule } from './midia/midia.module';
import { MotoristasModule } from './motoristas/motoristas.module';
import { PrismaModule } from './prisma/prisma.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { VeiculosModule } from './veiculos/veiculos.module';
import { VistoriasModule } from './vistorias/vistorias.module';
import { PneusModule } from './pneus/pneus.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarAmbiente }),
    // limite de tentativas: só nas rotas com ThrottlerGuard (login) — contra força bruta de senha
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: Number(config.get<string>('LOGIN_LIMITE_POR_MINUTO', '10')) }],
        errorMessage: 'Muitas tentativas de login. Espere um minuto e tente de novo.',
      }),
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    EmpresasModule,
    IntegracaoRastreamentoModule,
    VeiculosModule,
    MotoristasModule,
    FornecedoresModule,
    AbastecimentosModule,
    ManutencoesModule,
    VistoriasModule,
    PneusModule,
    MidiaModule,
    DashboardModule,
    RelatoriosModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
