import { ChecklistStepState } from './inspection.model';
import { VehicleType } from './vehicle-type.model';

export type QueueStatus = 'queued' | 'sending' | 'sent' | 'error';

export interface QueuedInspection {
  id: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  createdAt: string;
  steps: ChecklistStepState[];
  hasCriticalAlert: boolean;
  hasWarnAlert: boolean;
  status: QueueStatus;
}
