import { VehicleType } from './vehicle-type.model';

export interface Vehicle {
  /** id do veículo na API — é o que a vistoria envia (POST /vistorias) */
  id: string;
  plate: string;
  model: string;
  /** a API ainda não tem cor de veículo; fica null e a tela omite */
  color: string | null;
  odometerKm: number;
  photoDataUrl: string | null;
  type: VehicleType;
}
