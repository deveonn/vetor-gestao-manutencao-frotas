import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { QueuedInspection } from '../models/queue.model';
import { ChecklistStepState } from '../models/inspection.model';
import { VehicleType } from '../models/vehicle-type.model';
import { PhotoStorageService } from './photo-storage.service';
import { SessionService } from './session.service';

const QUEUE_KEY = 'vetor.queue';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private session = inject(SessionService);
  private fotos = inject(PhotoStorageService);

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
      const itens = JSON.parse(value) as QueuedInspection[];
      const tinhaBase64 = itens.some((it) => it.steps.some((s) => s.subItems.some((x) => x.photoDataUrl)));
      this.todos.set(tinhaBase64 ? await this.fotosParaArquivo(itens) : itens);
      if (tinhaBase64) await this.persist();
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
   * Vistoria aceita pelo servidor: marca como enviada, guarda o id do servidor e apaga os arquivos das fotos
   * (já estão no servidor; manter só ocupa o armazenamento do aparelho).
   */
  async markSent(id: string, serverId: string): Promise<void> {
    const fotos = (this.getById(id)?.steps ?? []).flatMap((s) => s.subItems.map((x) => x.photoPath));
    this.todos.update((list) =>
      list.map((i) =>
        i.id !== id
          ? i
          : {
              ...i,
              status: 'sent' as const,
              serverId,
              steps: i.steps.map((s) => ({ ...s, subItems: s.subItems.map((x) => ({ ...x, photoPath: null })) })),
            },
      ),
    );
    await this.persist();
    for (const path of fotos) await this.fotos.apagar(path);
  }

  /**
   * Fila de antes das fotos em arquivo: cada foto em base64 vira arquivo (as de vistoria já enviada só são
   * descartadas — já estão no servidor).
   */
  private async fotosParaArquivo(itens: QueuedInspection[]): Promise<QueuedInspection[]> {
    const convertidos: QueuedInspection[] = [];
    for (const item of itens) {
      const steps = [];
      for (const step of item.steps) {
        const subItems = [];
        for (const { photoDataUrl, ...sub } of step.subItems) {
          const guardar = photoDataUrl && !sub.photoPath && item.status !== 'sent';
          subItems.push({ ...sub, photoPath: guardar ? await this.fotos.salvar(photoDataUrl) : (sub.photoPath ?? null) });
        }
        steps.push({ ...step, subItems });
      }
      convertidos.push({ ...item, steps });
    }
    return convertidos;
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
