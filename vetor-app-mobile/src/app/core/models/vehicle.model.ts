import { VehicleType } from './vehicle-type.model';

export interface Vehicle {
  plate: string;
  model: string;
  color: string;
  odometerKm: number;
  photoDataUrl: string | null;
  type: VehicleType;
}
