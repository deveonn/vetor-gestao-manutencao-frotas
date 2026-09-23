import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';
import { VehicleService } from '../../../core/services/vehicle.service';
import { QueueService } from '../../../core/services/queue.service';
import { NetworkService } from '../../../core/services/network.service';
import { dayLabel, timeLabel } from '../../../core/utils/date-format';
import { queueStatusIcon, queueStatusIsFilled, queueStatusLabel } from '../../../core/utils/queue-status';
import { QueuedInspection } from '../../../core/models/queue.model';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-home',
  imports: [OfflineBannerComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  readonly recentInspections = computed(() => this.queue.items().slice(0, 4));

  readonly offlineMessage = computed(() => {
    const n = this.queue.queuedCount();
    const plural = n === 1 ? 'vistoria será enviada sozinha' : `${n} vistorias serão enviadas sozinhas`;
    return n > 0
      ? `sem internet agora — pode trabalhar normal. ${plural} quando a internet voltar.`
      : 'sem internet agora — pode trabalhar normal. tudo é enviado depois.';
  });

  constructor(
    readonly vehicle: VehicleService,
    readonly queue: QueueService,
    readonly network: NetworkService,
    private router: Router,
  ) {}

  dayLabel = dayLabel;
  timeLabel = timeLabel;
  queueStatusIcon = queueStatusIcon;
  queueStatusIsFilled = queueStatusIsFilled;
  queueStatusLabel = queueStatusLabel;

  statusColor(status: QueuedInspection['status']): string {
    switch (status) {
      case 'sent':
      case 'sending':
        return 'var(--ok)';
      case 'error':
        return 'var(--crit)';
      default:
        return 'var(--warn)';
    }
  }

  startInspection(): void {
    this.router.navigateByUrl('/confirmar-veiculo');
  }
}
