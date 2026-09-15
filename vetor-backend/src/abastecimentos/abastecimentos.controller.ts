import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { AbastecimentosService } from './abastecimentos.service';
import { CreateAbastecimentoDto } from './dto/create-abastecimento.dto';

@ApiTags('abastecimentos')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('abastecimentos')
export class AbastecimentosController {
  constructor(private service: AbastecimentosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.empresaId!);
  }

  @ApiQuery({ name: 'semanas', required: false, example: 8 })
  @Get('km-l-semanal')
  kmLSemanal(@CurrentUser() user: JwtPayload, @Query('semanas') semanas?: string) {
    return this.service.kmLSemanal(user.empresaId!, semanas ? parseInt(semanas, 10) : 8);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateAbastecimentoDto) {
    return this.service.criar(user.empresaId!, dto);
  }
}
