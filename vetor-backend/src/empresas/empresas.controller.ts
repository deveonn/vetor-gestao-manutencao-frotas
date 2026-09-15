import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresasService } from './empresas.service';

@ApiTags('empresa')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('empresa')
export class EmpresasController {
  constructor(private service: EmpresasService) {}

  @Get()
  buscar(@CurrentUser() user: JwtPayload) {
    return this.service.buscar(user.empresaId!);
  }

  @Patch()
  atualizar(@CurrentUser() user: JwtPayload, @Body() dto: UpdateEmpresaDto) {
    return this.service.atualizar(user.empresaId!, dto);
  }
}
