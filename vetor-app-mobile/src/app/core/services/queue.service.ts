import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { QueuedInspection } from '../models/queue.model';
import { ChecklistStepState } from '../models/inspection.model';
import { VehicleType } from '../models/vehicle-type.model';

const QUEUE_KEY = 'vetor.queue';

@Injectable({ providedIn: 'root' })
export class QueueService {
  readonly items = signal<QueuedInspection[]>([]);
  readonly loaded = signal(false);

  readonly queuedCount = computed(
    () => this.items().filter((i) => i.status === 'queued' || i.status === 'sending').length,
  );

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    if (value) {
      this.items.set(JSON.parse(value) as QueuedInspection[]);
    }
    this.loaded.set(true);
  }

  private async persist(): Promise<void> {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(this.items()) });
  }

  async enqueue(
    vehiclePlate: string,
    vehicleType: VehicleType,
    steps: ChecklistStepState[],
  ): Promise<QueuedInspection> {
    const hasCriticalAlert = steps.some((s) => s.subItems.some((i) => i.rating === 'trocar'));
    const hasWarnAlert = steps.some((s) => s.subItems.some((i) => i.rating === 'atencao'));
    const inspection: QueuedInspection = {
      id: crypto.randomUUID(),
      vehiclePlate,
      vehicleType,
      createdAt: new Date().toISOString(),
      steps,
      hasCriticalAlert,
      hasWarnAlert,
      status: 'queued',
    };
    this.items.update((list) => [inspection, ...list]);
    await this.persist();
    return inspection;
  }

  async updateStatus(id: string, status: QueuedInspection['status']): Promise<void> {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));
    await this.persist();
  }

  /** Grava o progresso da sincronização (ex.: midiaId das fotos já enviadas) no item da fila. */
  async updateSteps(id: string, steps: ChecklistStepState[]): Promise<void> {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, steps } : i)));
    await this.persist();
  }

  getById(id: string): QueuedInspection | undefined {
    return this.items().find((i) => i.id === id);
  }
}
