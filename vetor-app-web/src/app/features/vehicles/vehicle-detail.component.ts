import { Component, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { InstrumentBarComponent } from '../../shared/instrument-bar/instrument-bar.component';

@Component({
  selector: 'vetor-vehicle-detail',
  imports: [InstrumentBarComponent],
  templateUrl: './vehicle-detail.component.html',
  styleUrl: './vehicle-detail.component.scss',
})
export class VehicleDetailComponent {
  store = inject(FleetStore);
  private modal = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private placaParam = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  placa = computed(() => this.placaParam().get('placa') ?? '');
  d = computed(() => this.store.findVehicleByPlaca(this.placa()));

  dAb = computed(() => this.store.fuelEnriched().filter((r) => r.v === this.placa()));
  dMan = computed(() => this.store.maintenanceEnriched().filter((m) => m.v === this.placa()));
  dVist = computed(() => this.store.inspectionsEnriched().filter((vi) => vi.v === this.placa()));
  dVinc = computed(() => {
    const v = this.d();
    if (!v) return [];
    return [
      { mot: v.mot || '—', de: v.mot ? 'ago 2024' : '—', ate: 'atual' },
      { mot: 'Paulo Cezar', de: 'jan 2024', ate: 'ago 2024' },
    ];
  });

  irVeiculos(): void {
    this.router.navigate(['/veiculos']);
  }

  abrirExcluir(): void {
    this.modal.open('excluir', this.placa());
  }

  abrirAbast(): void {
    this.modal.open('abast');
  }

  concluir(id: string): void {
    this.store.completeMaintenance(id);
  }
}
