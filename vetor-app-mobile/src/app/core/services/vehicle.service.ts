import { Injectable, signal } from '@angular/core';
import { Vehicle } from '../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  /** Veículo de hoje — mock, sem backend de vinculação de frota ainda. */
  readonly todaysVehicle = signal<Vehicle | null>({
    plate: 'RQF-2318',
    model: 'mercedes sprinter 415',
    color: 'branca',
    odometerKm: 84312,
    photoDataUrl: null,
    type: 'van',
  });
}
