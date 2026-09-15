import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { VeiculosService } from './veiculos.service';

/** Rota separada porque o consumidor é o app mobile do motorista, não o painel web. */
@ApiTags('veiculos')
@ApiBearerAuth()
@Roles(Papel.MOTORISTA)
@Controller('motorista/veiculo-do-dia')
export class VeiculoDoDiaController {
  constructor(private service: VeiculosService) {}

  @Get()
  veiculoDoDia(@CurrentUser() user: JwtPayload) {
    return this.service.veiculoDoDia(user.empresaId!, user.motoristaId!);
  }
}
