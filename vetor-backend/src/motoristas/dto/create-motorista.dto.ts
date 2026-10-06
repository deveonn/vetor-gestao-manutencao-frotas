import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { FORMATO_USUARIO, MSG_USUARIO } from './acesso-motorista.dto';

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

  /** Acesso ao app — usuario e senha vão juntos (ou nenhum dos dois: o acesso pode ser criado depois). */
  @ApiPropertyOptional({ example: 'joao.prates', description: 'login do motorista no app' })
  @IsOptional()
  @IsString()
  @Matches(FORMATO_USUARIO, { message: MSG_USUARIO })
  usuario?: string;

  @ApiPropertyOptional({ example: 'senha123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'senha: mínimo de 6 caracteres.' })
  @MaxLength(72)
  senha?: string;
}
