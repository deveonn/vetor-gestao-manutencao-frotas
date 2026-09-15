import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload';
import { MidiaService } from './midia.service';

/** Storage local em dev (UPLOADS_DIR) — trocar por um storage de objetos (S3-compatible) antes de produção. */
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
      storage: diskStorage({
        destination: process.env.UPLOADS_DIR ?? './uploads',
        filename: (_req, file, cb) => {
          const nomeUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, nomeUnico);
        },
      }),
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
    return this.service.registrar(user.empresaId!, arquivo.filename);
  }
}
