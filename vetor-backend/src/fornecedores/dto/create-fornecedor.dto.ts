import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFornecedorDto {
  @ApiProperty({ example: 'Ipiranga BR-116' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiPropertyOptional({ example: 'BR-116, km 234' })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional({ example: 'Guarulhos' })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: '(11) 4123-5566' })
  @IsOptional()
  @IsString()
  telefone?: string;
}
