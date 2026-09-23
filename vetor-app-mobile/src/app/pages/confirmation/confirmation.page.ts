import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QueueService } from '../../core/services/queue.service';
import { QueuedInspection } from '../../core/models/queue.model';
import { NetworkService } from '../../core/services/network.service';

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.page.html',
  styleUrl: './confirmation.page.scss',
})
export class ConfirmationPage implements OnInit {
  readonly inspection = signal<QueuedInspection | null>(null);

  constructor(
    private router: Router,
    readonly queue: QueueService,
    readonly network: NetworkService,
  ) {}

  ngOnInit(): void {
    const id = (history.state as { inspectionId?: string } | null)?.inspectionId;
    if (id) {
      this.inspection.set(this.queue.getById(id) ?? null);
    }
  }

  goHome(): void {
    this.router.navigateByUrl('/tabs', { replaceUrl: true });
  }

  viewSummary(): void {
    this.router.navigateByUrl('/tabs/historico', { replaceUrl: true });
  }
}
