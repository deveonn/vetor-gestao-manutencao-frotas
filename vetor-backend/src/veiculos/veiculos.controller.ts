import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
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

  /** Foto do veículo (multipart, campo "arquivo", até 8 MB, só imagem) — o app mostra pro motorista. */
  @Post(':id/foto')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { arquivo: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new BadRequestException('Apenas arquivos de imagem são aceitos.'), false),
    }),
  )
  definirFoto(@CurrentUser() user: JwtPayload, @Param('id') id: string, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.service.definirFoto(user.empresaId!, id, arquivo.buffer, arquivo.mimetype);
  }

  @Delete(':id/foto')
  removerFoto(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.removerFoto(user.empresaId!, id);
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
