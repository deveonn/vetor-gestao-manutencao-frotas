import { Component, computed, inject } from '@angular/core';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-drivers',
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.scss',
})
export class DriversComponent {
  store = inject(FleetStore);
  private modal = inject(ModalService);

  resumo = computed(() => {
    const list = this.store.driversEnriched();
    const vinculados = list.filter((m) => m.v).length;
    const vencendo = list.filter((m) => m.dias != null && m.dias <= 90).length;
    return { total: list.length, vinculados, vencendo };
  });

  abrirMot(): void {
    this.modal.open('mot');
  }
}
