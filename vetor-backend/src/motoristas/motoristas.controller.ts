import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { AcessoMotoristaDto } from './dto/acesso-motorista.dto';
import { CreateMotoristaDto } from './dto/create-motorista.dto';
import { UpdateMotoristaDto } from './dto/update-motorista.dto';
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

  @Patch(':id')
  atualizar(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateMotoristaDto) {
    return this.service.atualizar(user.empresaId!, id, dto);
  }

  /** Arquiva (não apaga): ver MotoristasService.arquivar. */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async arquivar(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    await this.service.arquivar(user.empresaId!, id);
  }

  @Put(':id/acesso')
  definirAcesso(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AcessoMotoristaDto) {
    return this.service.definirAcesso(user.empresaId!, id, dto);
  }
}
