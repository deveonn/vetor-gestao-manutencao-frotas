import { VehicleType, VEHICLE_TIRE_POSITIONS } from './vehicle-type.model';

export type Rating = 'ok' | 'atencao' | 'trocar';

export type StepStatus = 'pending' | 'next' | 'done-ok' | 'done-warn' | 'done-crit';

/**
 * 'on-issue' — foto só é obrigatória se o motorista marcar "precisa de atenção" ou "precisa manutenção corretiva";
 *              se estiver tudo bom, não precisa provar com foto (ex.: pneus, avarias na lataria).
 * 'none'     — passo não tem foto.
 */
export type PhotoRequirement = 'none' | 'on-issue';

export interface SubItemState {
  label: string;
  rating: Rating | null;
  photoDataUrl: string | null;
  /** id da foto já enviada (POST /midia) — preenchido na sincronização, evita reenviar a mesma foto */
  midiaId?: string | null;
  /** diagrama do veículo destacando a posição (ex.: pneu) — só quando aplicável */
  image?: string;
  /** breve descrição do problema — preenchida quando a avaliação é atenção/trocar, se o passo pedir */
  note: string | null;
}

export interface ChecklistStepConfig {
  id: string;
  label: string;
  icon: string;
  photoRequirement: PhotoRequirement;
  /** pede uma descrição do problema quando a avaliação é atenção/trocar (independente de pedir foto) */
  noteOnIssue: boolean;
  /** exemplo mostrado no campo de descrição, contextualizado pro que está sendo verificado */
  notePlaceholder: string;
  /** ignorado no passo "pneus": as posições vêm de VEHICLE_TIRE_POSITIONS conforme o tipo do veículo */
  subLabels: string[];
}

export interface ChecklistStepState {
  id: string;
  label: string;
  icon: string;
  photoRequirement: PhotoRequirement;
  noteOnIssue: boolean;
  notePlaceholder: string;
  subItems: SubItemState[];
}

export const CHECKLIST_CONFIG: ChecklistStepConfig[] = [
  {
    id: 'pneus',
    label: 'pneus',
    icon: 'trip_origin',
    photoRequirement: 'on-issue',
    noteOnIssue: true,
    notePlaceholder: 'ex.: bolha na lateral do pneu, precisa trocar antes da próxima viagem',
    subLabels: [],
  },
  {
    id: 'oleo-agua',
    label: 'óleo e água',
    icon: 'opacity',
    photoRequirement: 'none',
    noteOnIssue: true,
    notePlaceholder: 'ex.: nível do óleo abaixo do mínimo, precisa completar antes de rodar',
    subLabels: ['óleo e água'],
  },
  {
    id: 'luzes-setas',
    label: 'luzes e setas',
    icon: 'lightbulb',
    photoRequirement: 'none',
    noteOnIssue: true,
    notePlaceholder: 'ex.: luz de freio traseira direita queimada',
    subLabels: ['luzes e setas'],
  },
  {
    id: 'freios',
    label: 'freios',
    icon: 'warning',
    photoRequirement: 'none',
    noteOnIssue: true,
    notePlaceholder: 'ex.: pedal do freio muito mole, precisa de revisão',
    subLabels: ['freios'],
  },
  {
    id: 'lataria',
    label: 'avarias na lataria',
    icon: 'directions_car',
    photoRequirement: 'on-issue',
    noteOnIssue: true,
    notePlaceholder: 'ex.: amassado na porta traseira direita, arranhão fundo',
    subLabels: ['lataria'],
  },
];

export function createEmptyChecklist(vehicleType: VehicleType): ChecklistStepState[] {
  return CHECKLIST_CONFIG.map((cfg) => {
    if (cfg.id === 'pneus') {
      const positions = VEHICLE_TIRE_POSITIONS[vehicleType];
      return {
        id: cfg.id,
        label: cfg.label,
        icon: cfg.icon,
        photoRequirement: cfg.photoRequirement,
        noteOnIssue: cfg.noteOnIssue,
        notePlaceholder: cfg.notePlaceholder,
        subItems: positions.map((p) => ({
          label: p.label,
          rating: null,
          photoDataUrl: null,
          image: p.image,
          note: null,
        })),
      };
    }
    return {
      id: cfg.id,
      label: cfg.label,
      icon: cfg.icon,
      photoRequirement: cfg.photoRequirement,
      noteOnIssue: cfg.noteOnIssue,
      notePlaceholder: cfg.notePlaceholder,
      subItems: cfg.subLabels.map((label) => ({ label, rating: null, photoDataUrl: null, note: null })),
    };
  });
}
