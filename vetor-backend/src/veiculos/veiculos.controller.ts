import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { CreateVinculoDto } from './dto/create-vinculo.dto';
import { OficinaVeiculoDto } from './dto/oficina-veiculo.dto';
import { UpdateVeiculoDto } from './dto/update-veiculo.dto';
import { VeiculosService } from './veiculos.service';

@ApiTags('veiculos')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('veiculos')
export class VeiculosController {
  constructor(private service: VeiculosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.empresaId!);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateVeiculoDto) {
    return this.service.criar(user.empresaId!, dto);
  }

  @Get(':id')
  buscar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.buscar(user.empresaId!, id);
  }

  @Get(':id/vinculos')
  vinculos(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.vinculos(user.empresaId!, id);
  }

  @Post(':id/vinculos')
  criarVinculo(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateVinculoDto) {
    return this.service.criarVinculo(user.empresaId!, id, dto);
  }

  @Patch(':id')
  atualizar(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateVeiculoDto) {
    return this.service.atualizar(user.empresaId!, id, dto);
  }

  @Patch(':id/oficina')
  definirOficina(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: OficinaVeiculoDto) {
    return this.service.definirOficina(user.empresaId!, id, dto.naOficina);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async arquivar(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    await this.service.arquivar(user.empresaId!, id);
  }
}
