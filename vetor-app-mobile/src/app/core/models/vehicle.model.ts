import { VehicleType } from './vehicle-type.model';

export interface Vehicle {
  /** id do veículo na API — é o que a vistoria envia (POST /vistorias) */
  id: string;
  plate: string;
  model: string;
  /** a API ainda não tem cor de veículo; fica null e a tela omite */
  color: string | null;
  odometerKm: number;
  /** foto do veículo (URL da API/R2, cadastrada pelo gestor no painel); null = desenho do tipo */
  photoDataUrl: string | null;
  type: VehicleType;
}
