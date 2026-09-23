import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  ChecklistStepState,
  Rating,
  StepStatus,
  createEmptyChecklist,
} from '../models/inspection.model';
import { VehicleType } from '../models/vehicle-type.model';

const DRAFT_KEY = 'vetor.inspection-draft';

interface Draft {
  steps: ChecklistStepState[];
  startedAt: string | null;
  vehiclePlate: string | null;
  vehicleType: VehicleType;
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  readonly steps = signal<ChecklistStepState[]>(createEmptyChecklist('van'));
  readonly startedAt = signal<string | null>(null);
  readonly vehiclePlate = signal<string | null>(null);
  readonly vehicleType = signal<VehicleType>('van');

  readonly totalSubItems = computed(() =>
    this.steps().reduce((sum, s) => sum + s.subItems.length, 0),
  );
  readonly doneSubItems = computed(() =>
    this.steps().reduce((sum, s) => sum + s.subItems.filter((i) => i.rating !== null).length, 0),
  );
  readonly progressPct = computed(() => {
    const total = this.totalSubItems();
    return total === 0 ? 0 : Math.round((this.doneSubItems() / total) * 100);
  });
  readonly doneStepsCount = computed(
    () => this.steps().filter((s) => this.isStepDone(s)).length,
  );

  readonly nextStep = computed<ChecklistStepState | null>(() => {
    return this.steps().find((s) => !this.isStepDone(s)) ?? null;
  });

  readonly hasUnsavedChanges = computed(() =>
    this.steps().some((s) => s.subItems.some((i) => i.rating !== null)),
  );

  readonly hasCriticalAlert = computed(() =>
    this.steps().some((s) => s.subItems.some((i) => i.rating === 'trocar')),
  );
  readonly hasWarnAlert = computed(() =>
    this.steps().some((s) => s.subItems.some((i) => i.rating === 'atencao')),
  );

  constructor() {
    this.restore();
  }

  private async restore(): Promise<void> {
    const { value } = await Preferences.get({ key: DRAFT_KEY });
    if (!value) return;
    const draft = JSON.parse(value) as Draft;
    if (!draft.vehiclePlate) return;

    const vehicleType = draft.vehicleType ?? 'van';
    // remonta o checklist a partir da config atual do código (labels, ícones, photoRequirement, diagramas)
    // e só reaproveita o progresso (avaliação/foto) do rascunho salvo — assim uma mudança de config entre
    // sessões não deixa o app preso num formato antigo de um rascunho já persistido.
    const fresh = createEmptyChecklist(vehicleType);
    const merged = fresh.map((freshStep) => {
      const savedStep = draft.steps.find((s) => s.id === freshStep.id);
      if (!savedStep) return freshStep;
      return {
        ...freshStep,
        subItems: freshStep.subItems.map((freshSub, idx) => {
          const savedSub = savedStep.subItems[idx];
          return savedSub
            ? {
                ...freshSub,
                rating: savedSub.rating,
                photoDataUrl: savedSub.photoDataUrl,
                note: savedSub.note ?? null,
              }
            : freshSub;
        }),
      };
    });

    this.steps.set(merged);
    this.startedAt.set(draft.startedAt);
    this.vehiclePlate.set(draft.vehiclePlate);
    this.vehicleType.set(vehicleType);
  }

  private async persist(): Promise<void> {
    const draft: Draft = {
      steps: this.steps(),
      startedAt: this.startedAt(),
      vehiclePlate: this.vehiclePlate(),
      vehicleType: this.vehicleType(),
    };
    await Preferences.set({ key: DRAFT_KEY, value: JSON.stringify(draft) });
  }

  start(vehiclePlate: string, vehicleType: VehicleType): void {
    this.steps.set(createEmptyChecklist(vehicleType));
    this.startedAt.set(new Date().toISOString());
    this.vehiclePlate.set(vehiclePlate);
    this.vehicleType.set(vehicleType);
    void this.persist();
  }

  isStepDone(step: ChecklistStepState): boolean {
    return step.subItems.every((i) => i.rating !== null);
  }

  stepStatus(step: ChecklistStepState): StepStatus {
    if (this.isStepDone(step)) {
      if (step.subItems.some((i) => i.rating === 'trocar')) return 'done-crit';
      if (step.subItems.some((i) => i.rating === 'atencao')) return 'done-warn';
      return 'done-ok';
    }
    return this.nextStep()?.id === step.id ? 'next' : 'pending';
  }

  /** primeiro sub-item ainda não avaliado dentro do passo; -1 se todos avaliados */
  nextIncompleteSubIndex(stepId: string): number {
    const step = this.steps().find((s) => s.id === stepId);
    if (!step) return -1;
    return step.subItems.findIndex((i) => i.rating === null);
  }

  getStep(stepId: string): ChecklistStepState | undefined {
    return this.steps().find((s) => s.id === stepId);
  }

  setPhoto(stepId: string, subIndex: number, dataUrl: string): void {
    this.steps.update((steps) =>
      steps.map((s) =>
        s.id !== stepId
          ? s
          : {
              ...s,
              subItems: s.subItems.map((i, idx) =>
                idx !== subIndex ? i : { ...i, photoDataUrl: dataUrl },
              ),
            },
      ),
    );
    void this.persist();
  }

  setNote(stepId: string, subIndex: number, note: string): void {
    this.steps.update((steps) =>
      steps.map((s) =>
        s.id !== stepId
          ? s
          : {
              ...s,
              subItems: s.subItems.map((i, idx) =>
                idx !== subIndex ? i : { ...i, note: note.trim() || null },
              ),
            },
      ),
    );
    void this.persist();
  }

  setRating(stepId: string, subIndex: number, rating: Rating): void {
    this.steps.update((steps) =>
      steps.map((s) =>
        s.id !== stepId
          ? s
          : {
              ...s,
              subItems: s.subItems.map((i, idx) => (idx !== subIndex ? i : { ...i, rating })),
            },
      ),
    );
    void this.persist();
  }

  reset(): void {
    this.steps.set(createEmptyChecklist(this.vehicleType()));
    this.startedAt.set(null);
    this.vehiclePlate.set(null);
    void Preferences.remove({ key: DRAFT_KEY });
  }
}
