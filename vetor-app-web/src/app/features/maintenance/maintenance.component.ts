import { Component, inject } from '@angular/core';
import { FleetStore } from '../../core/fleet.store';
import { InstrumentBarComponent } from '../../shared/instrument-bar/instrument-bar.component';

@Component({
  selector: 'vetor-maintenance',
  imports: [InstrumentBarComponent],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent {
  store = inject(FleetStore);

  concluir(id: string): void {
    this.store.completeMaintenance(id);
  }
}
