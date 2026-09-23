import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMotoristaDto } from './dto/create-motorista.dto';

@Injectable()
export class MotoristasService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.motorista.findMany({
      where: { empresaId },
      include: {
        // veículo arquivado mantém motoristaAtualId, mas não conta mais como vínculo ativo
        veiculoAtual: { where: { arquivadoEm: null } },
        // vínculos abertos, pra exibir o "vínculo desde" do veículo atual
        vinculos: { where: { ate: null, veiculo: { arquivadoEm: null } }, orderBy: { de: 'desc' } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  criar(empresaId: string, dto: CreateMotoristaDto) {
    return this.prisma.motorista.create({
      data: {
        empresaId,
        nome: dto.nome,
        categoriaCnh: dto.categoriaCnh,
        validadeCnh: dto.validadeCnh ? new Date(dto.validadeCnh) : null,
      },
    });
  }
}
