import { Module } from '@nestjs/common';
import { IntegracaoRastreamentoController } from './integracao-rastreamento.controller';
import { IntegracaoRastreamentoService } from './integracao-rastreamento.service';

@Module({
  controllers: [IntegracaoRastreamentoController],
  providers: [IntegracaoRastreamentoService],
})
export class IntegracaoRastreamentoModule {}
