import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { InspectionService } from '../../core/services/inspection.service';
import { QueueService } from '../../core/services/queue.service';
import { ChecklistStepState, StepStatus } from '../../core/models/inspection.model';
import { VEHICLE_TYPE_META } from '../../core/models/vehicle-type.model';
import { OfflineBannerComponent } from '../../shared/components/offline-banner/offline-banner.component';
import { FotoSrcPipe } from '../../shared/pipes/foto-src.pipe';

@Component({
  selector: 'app-review',
  imports: [OfflineBannerComponent, AsyncPipe, FotoSrcPipe],
  templateUrl: './review.page.html',
  styleUrl: './review.page.scss',
})
export class ReviewPage {
  readonly now = new Date();

  constructor(
    readonly inspection: InspectionService,
    private queue: QueueService,
    private router: Router,
  ) {}

  get vehicleArticleDe(): string {
    return VEHICLE_TYPE_META[this.inspection.vehicleType()].articleDe;
  }

  status(step: ChecklistStepState): StepStatus {
    return this.inspection.stepStatus(step);
  }

  summaryText(step: ChecklistStepState): string {
    const status = this.status(step);
    const plural = step.subItems.length > 1;
    switch (status) {
      case 'done-crit':
        return 'precisa manutenção corretiva · vira alerta';
      case 'done-warn':
        return 'precisa de atenção';
      case 'done-ok':
        return plural ? 'estão bons' : 'tudo certo';
      default:
        return 'ainda não avaliado';
    }
  }

  summaryIcon(step: ChecklistStepState): { icon: string; color: string } {
    switch (this.status(step)) {
      case 'done-crit':
        return { icon: 'cancel', color: 'var(--crit)' };
      case 'done-warn':
        return { icon: 'warning', color: 'var(--warn)' };
      case 'done-ok':
        return { icon: 'check_circle', color: 'var(--ok)' };
      default:
        return { icon: 'radio_button_unchecked', color: 'var(--text-mut)' };
    }
  }

  get allStepsDone(): boolean {
    return this.inspection.nextStep() === null;
  }

  /** caminho da primeira foto do passo (mostrada com o pipe fotoSrc) */
  firstPhoto(step: ChecklistStepState): string | null {
    return step.subItems.find((i) => i.photoPath)?.photoPath ?? null;
  }

  firstNote(step: ChecklistStepState): string | null {
    return step.subItems.find((i) => i.note)?.note ?? null;
  }

  change(step: ChecklistStepState): void {
    this.router.navigateByUrl(`/vistoria/avaliar/${step.id}/0`);
  }

  back(): void {
    this.router.navigateByUrl('/vistoria');
  }

  async finish(): Promise<void> {
    const plate = this.inspection.vehiclePlate();
    if (!plate || !this.allStepsDone) return;
    const created = await this.queue.enqueue(
      this.inspection.vehicleId(),
      plate,
      this.inspection.vehicleType(),
      this.inspection.steps(),
      this.inspection.startedAt(),
    );
    this.inspection.reset();
    this.router.navigate(['/vistoria/confirmacao'], {
      replaceUrl: true,
      state: { inspectionId: created.id },
    });
  }
}
