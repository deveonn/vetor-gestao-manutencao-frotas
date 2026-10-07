import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** PATCH /veiculos/:id/oficina — marca/desmarca o veículo como na oficina (status "em manutenção"). */
export class OficinaVeiculoDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  naOficina: boolean;
}
