import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { ConectarRastreamentoDto } from './dto/conectar-rastreamento.dto';
import { IntegracaoRastreamentoService } from './integracao-rastreamento.service';

@ApiTags('integracao-rastreamento')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('integracoes/rastreamento')
export class IntegracaoRastreamentoController {
  constructor(private service: IntegracaoRastreamentoService) {}

  @Get()
  status(@CurrentUser() user: JwtPayload) {
    return this.service.status(user.empresaId!);
  }

  @Post('conectar')
  conectar(@CurrentUser() user: JwtPayload, @Body() dto: ConectarRastreamentoDto) {
    return this.service.conectar(user.empresaId!, dto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('testar')
  testar(@CurrentUser() user: JwtPayload) {
    return this.service.testar(user.empresaId!);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async remover(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.service.remover(user.empresaId!);
  }
}
