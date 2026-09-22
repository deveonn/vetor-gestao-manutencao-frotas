import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVinculoDto {
  @ApiProperty({ description: 'Id do motorista a vincular ao veículo' })
  @IsString()
  @IsNotEmpty()
  motoristaId: string;
}
