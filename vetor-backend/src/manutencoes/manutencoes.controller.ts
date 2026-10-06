import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { ConcluirManutencaoDto } from './dto/concluir-manutencao.dto';
import { CreateManutencaoDto } from './dto/create-manutencao.dto';
import { ManutencoesService } from './manutencoes.service';

@ApiTags('manutencoes')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('manutencoes')
export class ManutencoesController {
  constructor(private service: ManutencoesService) {}

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateManutencaoDto) {
    return this.service.criar(user.empresaId!, dto);
  }

  @Get('pendentes')
  pendentes(@CurrentUser() user: JwtPayload) {
    return this.service.pendentes(user.empresaId!);
  }

  @Get('historico')
  historico(@CurrentUser() user: JwtPayload) {
    return this.service.historico(user.empresaId!);
  }

  @Get('planos')
  planos(@CurrentUser() user: JwtPayload) {
    return this.service.planos(user.empresaId!);
  }

  @Post(':id/concluir')
  concluir(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ConcluirManutencaoDto) {
    return this.service.concluir(user.empresaId!, id, dto);
  }
}
