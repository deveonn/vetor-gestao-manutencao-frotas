import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('resumo')
  resumo(@CurrentUser() user: JwtPayload) {
    return this.service.resumo(user.empresaId!);
  }

  @Get('alertas')
  alertas(@CurrentUser() user: JwtPayload) {
    return this.service.alertas(user.empresaId!);
  }

  @ApiQuery({ name: 'semanas', required: false, example: 8 })
  @Get('custo-semanal')
  custoSemanal(@CurrentUser() user: JwtPayload, @Query('semanas') semanas?: string) {
    return this.service.custoSemanal(user.empresaId!, semanas ? parseInt(semanas, 10) : 8);
  }
}
