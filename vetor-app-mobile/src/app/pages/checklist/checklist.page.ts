import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InspectionService } from '../../core/services/inspection.service';
import { TargetAnnounceService } from '../../core/services/target-announce.service';
import { ChecklistStepState, StepStatus } from '../../core/models/inspection.model';
import { photoTargetLabel } from '../../core/utils/photo-target-label';
import { VEHICLE_TYPE_META } from '../../core/models/vehicle-type.model';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.page.html',
  styleUrl: './checklist.page.scss',
})
export class ChecklistPage {
  readonly busy = signal(false);

  constructor(
    readonly inspection: InspectionService,
    private announce: TargetAnnounceService,
    private router: Router,
  ) {}

  get vehicleArticleDe(): string {
    return VEHICLE_TYPE_META[this.inspection.vehicleType()].articleDe;
  }

  get stepProgressPct(): number {
    const total = this.inspection.steps().length;
    return total === 0 ? 0 : Math.round((this.inspection.doneStepsCount() / total) * 100);
  }

  status(step: ChecklistStepState): StepStatus {
    return this.inspection.stepStatus(step);
  }

  statusMeta(status: StepStatus): { icon: string; filled: boolean; text: string; color: string } {
    switch (status) {
      case 'done-ok':
        return { icon: 'check_circle', filled: true, text: 'feito — tudo bom', color: 'var(--ok)' };
      case 'done-warn':
        return { icon: 'warning', filled: true, text: 'feito — precisa de atenção', color: 'var(--warn)' };
      case 'done-crit':
        return { icon: 'cancel', filled: true, text: 'feito — precisa manutenção corretiva', color: 'var(--crit)' };
      case 'next':
        return { icon: 'arrow_forward', filled: false, text: 'é o próximo passo', color: 'var(--brand)' };
      default:
        return { icon: 'radio_button_unchecked', filled: false, text: 'ainda não', color: 'var(--text-mut)' };
    }
  }

  async openStep(step: ChecklistStepState): Promise<void> {
    if (this.busy()) return;
    const status = this.status(step);
    if (status === 'pending') return;

    const subIndex = status.startsWith('done') ? 0 : this.inspection.nextIncompleteSubIndex(step.id);
    const idx = subIndex === -1 ? 0 : subIndex;

    // passos com mais de uma posição (ex.: pneus) avisam qual delas antes de entrar na avaliação
    if (step.subItems.length > 1) {
      this.busy.set(true);
      const confirmed = await this.announce.announce(
        photoTargetLabel(step, idx),
        step.icon,
        step.subItems[idx].image,
      );
      this.busy.set(false);
      if (!confirmed) return;
    }

    this.router.navigateByUrl(`/vistoria/avaliar/${step.id}/${idx}`);
  }

  continue(): void {
    const next = this.inspection.nextStep();
    if (!next) {
      this.router.navigateByUrl('/vistoria/revisao');
      return;
    }
    void this.openStep(next);
  }

  back(): void {
    this.router.navigateByUrl('/tabs');
  }
}
