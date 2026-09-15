import { ApiProperty } from '@nestjs/swagger';
import { TipoVeiculo } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVeiculoDto {
  @ApiProperty({ example: 'ABC-1D23' })
  @IsString()
  @IsNotEmpty()
  placa: string;

  @ApiProperty({ required: false, example: 'Fiat Fiorino' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiProperty({ enum: TipoVeiculo })
  @IsEnum(TipoVeiculo)
  tipo: TipoVeiculo;
}
