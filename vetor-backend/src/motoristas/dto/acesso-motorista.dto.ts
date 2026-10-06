import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Login do app: minúsculas, números, ponto, hífen e sublinhado (ex.: "joao.prates"). */
export const FORMATO_USUARIO = /^[a-z0-9][a-z0-9._-]{2,39}$/;
export const MSG_USUARIO = 'usuario: 3 a 40 caracteres — letras minúsculas, números, ponto, hífen ou sublinhado.';

/** PUT /motoristas/:id/acesso — cria o acesso ao app (motorista sem login) ou redefine a senha. */
export class AcessoMotoristaDto {
  @ApiPropertyOptional({ example: 'joao.prates', description: 'obrigatório pra criar o acesso; opcional pra só trocar a senha' })
  @IsOptional()
  @IsString()
  @Matches(FORMATO_USUARIO, { message: MSG_USUARIO })
  usuario?: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'senha: mínimo de 6 caracteres.' })
  @MaxLength(72) // limite do bcrypt
  senha: string;
}
