import { Module } from '@nestjs/common';
import { VeiculoDoDiaController } from './veiculo-do-dia.controller';
import { VeiculosController } from './veiculos.controller';
import { VeiculosService } from './veiculos.service';

@Module({
  controllers: [VeiculosController, VeiculoDoDiaController],
  providers: [VeiculosService],
})
export class VeiculosModule {}
