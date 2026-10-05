import { ChecklistStepState } from './inspection.model';
import { VehicleType } from './vehicle-type.model';

export type QueueStatus = 'queued' | 'sending' | 'sent' | 'error';

export interface QueuedInspection {
  /** gerado no app; vai como `clienteId` no POST /vistorias pra reenvio não duplicar */
  id: string;
  /** id do veículo na API (itens de antes do mobile #3 não têm — ver SyncService) */
  vehicleId?: string | null;
  vehiclePlate: string;
  vehicleType: VehicleType;
  /** login do motorista que fez a vistoria — a fila só envia/mostra os itens de quem está logado */
  owner?: string | null;
  /** quando o motorista começou o checklist (vira `iniciadoEm` na API) */
  startedAt?: string | null;
  createdAt: string;
  steps: ChecklistStepState[];
  hasCriticalAlert: boolean;
  hasWarnAlert: boolean;
  status: QueueStatus;
  /** id da vistoria no servidor, depois de enviada */
  serverId?: string | null;
}
