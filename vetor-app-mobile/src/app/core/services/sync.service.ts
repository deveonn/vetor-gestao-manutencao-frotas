import { Injectable, effect, signal } from '@angular/core';
import { NetworkService } from './network.service';
import { QueueService } from './queue.service';

const SEND_DELAY_MS = 1200;

@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly syncing = signal(false);
  readonly sendingCount = signal(0);
  readonly totalToSend = signal(0);

  constructor(
    private network: NetworkService,
    private queue: QueueService,
  ) {
    effect(() => {
      const online = this.network.online();
      const loaded = this.queue.loaded();
      const hasQueued = this.queue.items().some((i) => i.status === 'queued');
      if (online && loaded && hasQueued && !this.syncing()) {
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
      await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
      await this.queue.updateStatus(item.id, 'sent');
      this.sendingCount.update((n) => n + 1);
    }

    this.syncing.set(false);
    this.totalToSend.set(0);
    this.sendingCount.set(0);
  }
}
