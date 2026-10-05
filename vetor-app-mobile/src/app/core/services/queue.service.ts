import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { QueuedInspection } from '../models/queue.model';
import { ChecklistStepState } from '../models/inspection.model';
import { VehicleType } from '../models/vehicle-type.model';
import { SessionService } from './session.service';

const QUEUE_KEY = 'vetor.queue';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private session = inject(SessionService);

  /** fila inteira do aparelho, de todos os motoristas que já usaram este celular */
  private readonly todos = signal<QueuedInspection[]>([]);
  readonly loaded = signal(false);

  /**
   * Só as vistorias do motorista logado (itens sem dono são de antes do login real e ficam com quem estiver).
   * É isso que a tela mostra e que a sincronização envia — a vistoria de outro motorista nunca vai com o token errado.
   */
  readonly items = computed(() => {
    const login = this.session.session()?.username;
    return login ? this.todos().filter((i) => !i.owner || i.owner === login) : [];
  });

  /** vistorias do motorista logado que ainda não chegaram ao servidor (na fila, enviando ou com erro) */
  readonly pendingCount = computed(() => this.items().filter((i) => i.status !== 'sent').length);

  readonly queuedCount = computed(
    () => this.items().filter((i) => i.status === 'queued' || i.status === 'sending').length,
  );

  /** resolve quando a fila já foi lida do Preferences */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    if (value) {
      this.todos.set(JSON.parse(value) as QueuedInspection[]);
    }
    this.loaded.set(true);
  }

  private async persist(): Promise<void> {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(this.todos()) });
  }

  async enqueue(
    vehicleId: string | null,
    vehiclePlate: string,
    vehicleType: VehicleType,
    steps: ChecklistStepState[],
    startedAt: string | null,
  ): Promise<QueuedInspection> {
    const hasCriticalAlert = steps.some((s) => s.subItems.some((i) => i.rating === 'trocar'));
    const hasWarnAlert = steps.some((s) => s.subItems.some((i) => i.rating === 'atencao'));
    const inspection: QueuedInspection = {
      id: crypto.randomUUID(),
      vehicleId,
      owner: this.session.session()?.username ?? null,
      startedAt,
      vehiclePlate,
      vehicleType,
      createdAt: new Date().toISOString(),
      steps,
      hasCriticalAlert,
      hasWarnAlert,
      status: 'queued',
    };
    this.todos.update((list) => [inspection, ...list]);
    await this.persist();
    return inspection;
  }

  async updateStatus(id: string, status: QueuedInspection['status']): Promise<void> {
    this.todos.update((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));
    await this.persist();
  }

  /** Grava o progresso da sincronização (ex.: midiaId das fotos já enviadas) no item da fila. */
  async updateSteps(id: string, steps: ChecklistStepState[]): Promise<void> {
    this.todos.update((list) => list.map((i) => (i.id === id ? { ...i, steps } : i)));
    await this.persist();
  }

  /**
   * Vistoria aceita pelo servidor: marca como enviada, guarda o id do servidor e tira as fotos em base64 da fila
   * (já estão no servidor; manter só ocupa o armazenamento do aparelho).
   */
  async markSent(id: string, serverId: string): Promise<void> {
    this.todos.update((list) =>
      list.map((i) =>
        i.id !== id
          ? i
          : {
              ...i,
              status: 'sent' as const,
              serverId,
              steps: i.steps.map((s) => ({ ...s, subItems: s.subItems.map((x) => ({ ...x, photoDataUrl: null })) })),
            },
      ),
    );
    await this.persist();
  }

  /**
   * Tira da fila as vistorias enviadas que já aparecem no histórico do servidor — sem isso a fila só cresce.
   * Espera a fila ser lida do Preferences (senão gravaria por cima a fila ainda não carregada).
   */
  async removerEnviadas(serverIds: Set<string>): Promise<void> {
    await this.ready;
    const antes = this.todos().length;
    this.todos.update((list) => list.filter((i) => !(i.status === 'sent' && i.serverId && serverIds.has(i.serverId))));
    if (this.todos().length !== antes) await this.persist();
  }

  getById(id: string): QueuedInspection | undefined {
    return this.todos().find((i) => i.id === id);
  }
}
