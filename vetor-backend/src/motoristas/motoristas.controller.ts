import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { AcessoMotoristaDto } from './dto/acesso-motorista.dto';
import { CreateMotoristaDto } from './dto/create-motorista.dto';
import { MotoristasService } from './motoristas.service';

@ApiTags('motoristas')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('motoristas')
export class MotoristasController {
  constructor(private service: MotoristasService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.empresaId!);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateMotoristaDto) {
    return this.service.criar(user.empresaId!, dto);
  }

  @Put(':id/acesso')
  definirAcesso(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AcessoMotoristaDto) {
    return this.service.definirAcesso(user.empresaId!, id, dto);
  }
}
