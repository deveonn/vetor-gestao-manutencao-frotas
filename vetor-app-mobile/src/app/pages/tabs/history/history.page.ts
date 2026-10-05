import { Component, computed } from '@angular/core';
import { HistoryService } from '../../../core/services/history.service';
import { QueueService } from '../../../core/services/queue.service';
import { SyncService } from '../../../core/services/sync.service';
import { NetworkService } from '../../../core/services/network.service';
import { dayLabel, timeLabel } from '../../../core/utils/date-format';
import { queueStatusIcon, queueStatusIsFilled, queueStatusLabel } from '../../../core/utils/queue-status';
import { HistoryEntry } from '../../../core/models/queue.model';
import { VEHICLE_TYPE_META } from '../../../core/models/vehicle-type.model';

interface DayGroup {
  label: string;
  items: HistoryEntry[];
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
})
export class HistoryPage {
  readonly groups = computed<DayGroup[]>(() => {
    // já vem ordenado (mais novas primeiro): servidor + fila local
    const byLabel = new Map<string, HistoryEntry[]>();
    for (const item of this.history.items()) {
      const label = dayLabel(item.createdAt);
      if (!byLabel.has(label)) byLabel.set(label, []);
      byLabel.get(label)!.push(item);
    }
    return Array.from(byLabel.entries()).map(([label, groupItems]) => ({ label, items: groupItems }));
  });

  dayLabel = dayLabel;
  timeLabel = timeLabel;
  queueStatusIcon = queueStatusIcon;
  queueStatusIsFilled = queueStatusIsFilled;
  queueStatusLabel = queueStatusLabel;

  constructor(
    readonly queue: QueueService,
    private history: HistoryService,
    readonly sync: SyncService,
    readonly network: NetworkService,
  ) {}

  statusColor(status: HistoryEntry['status']): string {
    switch (status) {
      case 'sent':
        return 'var(--ok)';
      case 'sending':
        return 'var(--ok)';
      case 'error':
        return 'var(--crit)';
      default:
        return 'var(--warn)';
    }
  }

  vehicleArticleDe(item: HistoryEntry): string {
    return VEHICLE_TYPE_META[item.vehicleType].articleDe;
  }

  retry(item: HistoryEntry): void {
    if (item.status !== 'error') return;
    void this.queue.updateStatus(item.id, 'queued');
  }
}
