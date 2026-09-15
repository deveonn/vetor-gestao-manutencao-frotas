import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

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
}
