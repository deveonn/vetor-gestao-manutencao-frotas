import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  /** Usado pela hospedagem pra saber se a API está de pé — inclui o banco: sem banco, 503. */
  @Public()
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'erro', banco: 'indisponível' });
    }
    return { status: 'ok', banco: 'ok', timestamp: new Date().toISOString() };
  }
}
