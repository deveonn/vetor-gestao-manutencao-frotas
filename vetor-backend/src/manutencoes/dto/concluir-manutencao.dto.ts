import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConcluirManutencaoDto {
  /** 0 vale (serviço em garantia/cortesia) */
  @ApiPropertyOptional({ example: 420 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  custo?: number;

  @ApiPropertyOptional({ example: 'Lubrax Express' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  oficina?: string;
}
