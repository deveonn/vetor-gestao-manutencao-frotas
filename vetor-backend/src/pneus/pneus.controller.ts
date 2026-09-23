import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { PneusService } from './pneus.service';

@ApiTags('pneus')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('pneus')
export class PneusController {
  constructor(private service: PneusService) {}

  @Get('sinalizados')
  sinalizados(@CurrentUser() user: JwtPayload) {
    return this.service.sinalizados(user.empresaId!);
  }
}
