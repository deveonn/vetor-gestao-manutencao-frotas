import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** PATCH /motoristas/:id — só o cadastro; login e senha do app vão por PUT /motoristas/:id/acesso. */
export class UpdateMotoristaDto {
  @ApiPropertyOptional({ example: 'João Prates' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @ApiPropertyOptional({ example: 'C' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoriaCnh?: string;

  @ApiPropertyOptional({ example: '2028-03-01', nullable: true, description: 'null apaga a validade' })
  @IsOptional()
  @IsDateString()
  validadeCnh?: string | null;
}
