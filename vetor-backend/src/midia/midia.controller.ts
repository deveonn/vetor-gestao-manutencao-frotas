import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { MidiaService } from './midia.service';

/** Onde o arquivo fica (disco ou bucket S3) é decisão do StorageService — aqui só recebe e valida. */
@ApiTags('midia')
@ApiBearerAuth()
@Roles(Papel.MOTORISTA)
@Controller('midia')
export class MidiaController {
  constructor(private service: MidiaService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { arquivo: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('arquivo', {
      // em memória (até 8 MB) e o StorageService grava — no disco ou no bucket
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Apenas arquivos de imagem são aceitos.'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async upload(@CurrentUser() user: JwtPayload, @UploadedFile() arquivo?: Express.Multer.File) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.service.registrar(user.empresaId!, arquivo.buffer, arquivo.mimetype);
  }
}
