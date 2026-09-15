import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  buscar(empresaId: string) {
    return this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  }

  atualizar(empresaId: string, dto: UpdateEmpresaDto) {
    return this.prisma.empresa.update({ where: { id: empresaId }, data: dto });
  }
}
