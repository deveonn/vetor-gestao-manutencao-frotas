import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMotoristaDto {
  @ApiProperty({ example: 'João Prates' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'B' })
  @IsString()
  @IsNotEmpty()
  categoriaCnh: string;

  @ApiPropertyOptional({ example: '2028-03-01' })
  @IsOptional()
  @IsDateString()
  validadeCnh?: string;
}
