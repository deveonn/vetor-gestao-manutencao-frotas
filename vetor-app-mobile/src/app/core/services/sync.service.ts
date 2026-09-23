import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, signal } from '@angular/core';
import { QueuedInspection } from '../models/queue.model';
import { MidiaService } from './midia.service';
import { NetworkService } from './network.service';
import { QueueService } from './queue.service';

const SEND_DELAY_MS = 1200;
/** Depois de uma falha de rede, espera isso antes de tentar a fila de novo (evita martelar sem conexão). */
const RETRY_APOS_FALHA_MS = 30_000;

/** Falha de rede (sem resposta do servidor) — o item volta pra fila; erro de servidor vira 'error'. */
function ehFalhaDeRede(err: unknown): boolean {
  return err instanceof HttpErrorResponse ? err.status === 0 : err instanceof TypeError;
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly syncing = signal(false);
  readonly sendingCount = signal(0);
  readonly totalToSend = signal(0);
  /** true durante a pausa depois de uma falha de rede */
  private readonly aguardando = signal(false);

  constructor(
    private network: NetworkService,
    private queue: QueueService,
    private midia: MidiaService,
  ) {
    effect(() => {
      const online = this.network.online();
      const loaded = this.queue.loaded();
      const hasQueued = this.queue.items().some((i) => i.status === 'queued');
      if (online && loaded && hasQueued && !this.syncing() && !this.aguardando()) {
        void this.drain();
      }
    });
  }

  private async drain(): Promise<void> {
    this.syncing.set(true);
    const pending = this.queue.items().filter((i) => i.status === 'queued');
    this.totalToSend.set(pending.length);
    this.sendingCount.set(0);

    for (const item of pending) {
      if (!this.network.online()) break;
      await this.queue.updateStatus(item.id, 'sending');
      try {
        await this.enviarFotos(item);
        // envio da vistoria em si ainda simulado — POST /vistorias entra no mobile #5
        await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
        await this.queue.updateStatus(item.id, 'sent');
        this.sendingCount.update((n) => n + 1);
      } catch (err) {
        if (ehFalhaDeRede(err)) {
          // sem conexão de verdade com a API: volta pra fila e tenta depois
          await this.queue.updateStatus(item.id, 'queued');
          this.pausar();
          break;
        }
        // o servidor recusou: o motorista vê "erro" no histórico e pode tentar de novo
        await this.queue.updateStatus(item.id, 'error');
      }
    }

    this.syncing.set(false);
    this.totalToSend.set(0);
    this.sendingCount.set(0);
  }

  /** Sobe as fotos que ainda não têm midiaId, gravando cada id na fila assim que ele volta. */
  private async enviarFotos(item: QueuedInspection): Promise<void> {
    let steps = this.queue.getById(item.id)?.steps ?? item.steps;
    for (let s = 0; s < steps.length; s++) {
      for (let i = 0; i < steps[s].subItems.length; i++) {
        const sub = steps[s].subItems[i];
        if (!sub.photoDataUrl || sub.midiaId) continue;
        const midiaId = await this.midia.upload(sub.photoDataUrl, `${steps[s].id}-${i + 1}`);
        steps = steps.map((step, si) =>
          si !== s ? step : { ...step, subItems: step.subItems.map((x, xi) => (xi !== i ? x : { ...x, midiaId })) },
        );
        await this.queue.updateSteps(item.id, steps);
      }
    }
  }

  private pausar(): void {
    this.aguardando.set(true);
    setTimeout(() => this.aguardando.set(false), RETRY_APOS_FALHA_MS);
  }
}
