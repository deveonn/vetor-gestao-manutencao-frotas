import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ConcluirManutencaoDto {
  @ApiPropertyOptional({ example: 420 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  custo?: number;

  @ApiPropertyOptional({ example: 'Lubrax Express' })
  @IsOptional()
  @IsString()
  oficina?: string;
}
