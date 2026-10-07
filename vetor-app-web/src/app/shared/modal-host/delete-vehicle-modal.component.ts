import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-delete-vehicle-modal',
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:430px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Excluir o veículo {{ placa() }}?</h2>
        <p style="color:var(--mut);font-size:13.5px;line-height:1.6;margin:0">O veículo sai da frota e o motorista vinculado fica sem veículo. Nada é apagado: abastecimentos, manutenções e vistorias ficam guardados, e cadastrar a mesma placa de novo reativa o veículo com todo o histórico.</p>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn" style="background:var(--crit);color:#fff;font-weight:600" (click)="confirmar()" [disabled]="excluindo()">{{ excluindo() ? 'Excluindo…' : 'Excluir veículo' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class DeleteVehicleModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);
  private router = inject(Router);

  placa = computed(() => this.modal.context() ?? '');
  excluindo = signal(false);

  async confirmar(): Promise<void> {
    const placa = this.placa();
    if (!placa) return;
    this.excluindo.set(true);
    const ok = await this.store.deleteVehicle(placa);
    this.excluindo.set(false);
    this.modal.close();
    if (ok) this.router.navigate(['/veiculos']);
  }
}
