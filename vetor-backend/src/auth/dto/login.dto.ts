import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'E-mail (root/admin) ou usuário (motorista)', example: 'rui@transportesalmeida.com.br' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @IsNotEmpty()
  senha: string;
}
