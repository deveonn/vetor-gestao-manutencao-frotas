import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateAbastecimentoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  veiculoId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fornecedorId: string;

  @ApiProperty({ example: 62.4 })
  @IsNumber()
  @IsPositive()
  litros: number;

  @ApiProperty({ example: 387.5 })
  @IsNumber()
  @IsPositive()
  valor: number;

  @ApiProperty({ example: 121480 })
  @IsInt()
  @Min(0)
  hodometro: number;

  @ApiPropertyOptional({ description: 'default: agora' })
  @IsOptional()
  @IsDateString()
  data?: string;
}
