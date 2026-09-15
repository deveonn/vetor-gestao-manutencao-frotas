import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { CreateVistoriaDto } from './dto/create-vistoria.dto';
import { VistoriasService } from './vistorias.service';

@ApiTags('vistorias')
@ApiBearerAuth()
@Controller('vistorias')
export class VistoriasController {
  constructor(private service: VistoriasService) {}

  @Roles(Papel.ADMIN)
  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.empresaId!);
  }

  @Roles(Papel.MOTORISTA)
  @Get('minhas')
  minhas(@CurrentUser() user: JwtPayload) {
    return this.service.minhas(user.empresaId!, user.motoristaId!);
  }

  @Roles(Papel.MOTORISTA)
  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateVistoriaDto) {
    return this.service.criar(user.empresaId!, user.motoristaId!, dto);
  }
}
