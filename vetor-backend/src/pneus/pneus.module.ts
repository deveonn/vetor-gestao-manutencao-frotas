import { Module } from '@nestjs/common';
import { PneusController } from './pneus.controller';
import { PneusService } from './pneus.service';

@Module({
  controllers: [PneusController],
  providers: [PneusService],
})
export class PneusModule {}
