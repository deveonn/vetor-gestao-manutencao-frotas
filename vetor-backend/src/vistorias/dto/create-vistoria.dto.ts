import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvaliacaoVistoria } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

/** Um item por sub-passo do checklist mobile (core/models/inspection.model.ts: SubItemState). */
class VistoriaItemDto {
  @ApiProperty({ example: 'pneus', description: "id de CHECKLIST_CONFIG: pneus | oleo-agua | luzes-setas | freios | lataria" })
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @ApiProperty({ example: 'dianteiro esquerdo' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: AvaliacaoVistoria })
  @IsEnum(AvaliacaoVistoria)
  avaliacao: AvaliacaoVistoria;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({ description: 'id retornado por POST /midia' })
  @IsOptional()
  @IsString()
  midiaId?: string;
}

export class CreateVistoriaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  veiculoId: string;

  @ApiPropertyOptional({ description: 'default: agora' })
  @IsOptional()
  @IsDateString()
  iniciadoEm?: string;

  @ApiProperty({ type: [VistoriaItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VistoriaItemDto)
  itens: VistoriaItemDto[];
}
