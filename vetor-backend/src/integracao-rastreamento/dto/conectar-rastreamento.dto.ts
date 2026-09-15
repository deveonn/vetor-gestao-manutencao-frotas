import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConectarRastreamentoDto {
  @ApiProperty({ example: 'hap_live_xxx' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
