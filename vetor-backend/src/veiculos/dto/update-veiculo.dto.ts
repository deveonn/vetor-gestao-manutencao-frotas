import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoVeiculo } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** PATCH /veiculos/:id — cadastro do veículo (hodômetro vem dos abastecimentos; status, de estado.ts). */
export class UpdateVeiculoDto {
  @ApiPropertyOptional({ example: 'RTX-4B21' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  placa?: string;

  @ApiPropertyOptional({ example: 'Fiat Fiorino' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ enum: TipoVeiculo, description: 'mudar o tipo ajusta as posições de pneu (caminhão leve = 6)' })
  @IsOptional()
  @IsEnum(TipoVeiculo)
  tipo?: TipoVeiculo;
}
