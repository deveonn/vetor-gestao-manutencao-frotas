import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { RelatoriosService } from './relatorios.service';

@ApiTags('relatorios')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private service: RelatoriosService) {}

  @Get('categorias-semana')
  categoriasSemana(@CurrentUser() user: JwtPayload) {
    return this.service.categoriasSemana(user.empresaId!);
  }

  @ApiQuery({ name: 'mesA', example: '2026-06', description: 'formato AAAA-MM' })
  @ApiQuery({ name: 'mesB', example: '2026-07', description: 'formato AAAA-MM' })
  @Get('categorias-mensal')
  categoriasMensal(@CurrentUser() user: JwtPayload, @Query('mesA') mesA: string, @Query('mesB') mesB: string) {
    return this.service.categoriasMensal(user.empresaId!, mesA, mesB);
  }

  @ApiQuery({ name: 'de', required: false, description: 'default: 30 dias atrás' })
  @ApiQuery({ name: 'ate', required: false, description: 'default: agora' })
  @ApiQuery({ name: 'veiculoId', required: false })
  @Get('custo-por-veiculo')
  custoPorVeiculo(
    @CurrentUser() user: JwtPayload,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('veiculoId') veiculoId?: string,
  ) {
    const agora = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    return this.service.custoPorVeiculo(user.empresaId!, de ? new Date(de) : trintaDiasAtras, ate ? new Date(ate) : agora, veiculoId);
  }
}
