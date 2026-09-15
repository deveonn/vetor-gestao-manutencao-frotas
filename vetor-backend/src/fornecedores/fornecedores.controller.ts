import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { FornecedoresService } from './fornecedores.service';

@ApiTags('fornecedores')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private service: FornecedoresService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.service.listar(user.empresaId!);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CreateFornecedorDto) {
    return this.service.criar(user.empresaId!, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remover(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    await this.service.remover(user.empresaId!, id);
  }
}
