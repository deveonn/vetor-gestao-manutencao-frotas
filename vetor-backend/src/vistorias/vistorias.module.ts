import { Module } from '@nestjs/common';
import { VistoriasController } from './vistorias.controller';
import { VistoriasService } from './vistorias.service';

@Module({
  controllers: [VistoriasController],
  providers: [VistoriasService],
})
export class VistoriasModule {}
