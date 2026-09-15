import { Module } from '@nestjs/common';
import { AbastecimentosController } from './abastecimentos.controller';
import { AbastecimentosService } from './abastecimentos.service';

@Module({
  controllers: [AbastecimentosController],
  providers: [AbastecimentosService],
  exports: [AbastecimentosService],
})
export class AbastecimentosModule {}
