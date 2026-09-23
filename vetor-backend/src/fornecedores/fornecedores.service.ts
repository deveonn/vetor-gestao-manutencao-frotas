import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';

@Injectable()
export class FornecedoresService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.fornecedor.findMany({
      where: { empresaId },
      include: { _count: { select: { abastecimentos: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  criar(empresaId: string, dto: CreateFornecedorDto) {
    return this.prisma.fornecedor.create({ data: { empresaId, ...dto } });
  }

  async remover(empresaId: string, id: string): Promise<void> {
    const fornecedor = await this.prisma.fornecedor.findFirst({ where: { id, empresaId } });
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado.');
    const usos = await this.prisma.abastecimento.count({ where: { fornecedorId: id } });
    if (usos > 0) {
      throw new ConflictException(`Fornecedor tem ${usos} abastecimento(s) registrado(s) e não pode ser excluído.`);
    }
    await this.prisma.fornecedor.delete({ where: { id } });
  }
}
