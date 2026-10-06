import { Component, inject } from '@angular/core';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { InstrumentBarComponent } from '../../shared/instrument-bar/instrument-bar.component';

@Component({
  selector: 'vetor-maintenance',
  imports: [InstrumentBarComponent],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent {
  store = inject(FleetStore);
  private modal = inject(ModalService);

  agendar(): void {
    this.modal.open('manut');
  }

  concluir(id: string): void {
    this.modal.open('concluir', id);
  }
}
