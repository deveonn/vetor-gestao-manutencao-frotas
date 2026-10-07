import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateEmpresaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contatoNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contatoEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contatoFone?: string;

  @ApiPropertyOptional({ example: 9, description: 'meta de consumo da frota em km/L' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(50)
  metaKmL?: number;
}
