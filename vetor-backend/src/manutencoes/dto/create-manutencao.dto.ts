import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** POST /manutencoes — agenda uma manutenção: fazer até o hodômetro chegar em `kmAlvo` e/ou até `dataLimite`. */
export class CreateManutencaoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  veiculoId: string;

  @ApiProperty({ example: 'Troca de óleo e filtro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  item: string;

  @ApiPropertyOptional({ example: 90000, description: 'hodômetro em que a manutenção deve ser feita' })
  @IsOptional()
  @IsInt()
  @Min(0)
  kmAlvo?: number;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'data limite (yyyy-mm-dd)' })
  @IsOptional()
  @IsDateString()
  dataLimite?: string;
}
