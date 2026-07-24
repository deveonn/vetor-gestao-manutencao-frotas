import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-vehicle-search-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop top" (click)="modal.close()">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:480px;max-height:70vh;padding:0" (click)="$event.stopPropagation()">
        <div style="display:flex;flex-direction:column;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:17px;margin:0">Procurar veículo</h2>
            <button (click)="modal.close()" style="width:30px;height:30px;border-radius:8px;background:none;border:1px solid var(--line);color:var(--mut);display:flex;align-items:center;justify-content:center">
              <span class="material-symbols-outlined" style="font-size:17px">close</span>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:10px;background:var(--surf2);border:1px solid var(--line);border-radius:10px;padding:10px 14px">
            <span class="material-symbols-outlined" style="font-size:19px;color:var(--dim)">search</span>
            <input [(ngModel)]="busca" placeholder="Placa, modelo ou motorista" style="flex:1;background:none;border:none;outline:none;color:var(--txt);font-size:14px;font-family:'IBM Plex Sans',sans-serif">
          </div>
        </div>
        <div style="overflow-y:auto;padding:8px 10px 12px">
          @for (v of resultados(); track v.placa) {
            <button (click)="escolher(v.placa)" style="display:grid;grid-template-columns:38px 1fr auto;gap:12px;align-items:center;width:100%;text-align:left;background:transparent;border:1px solid var(--line);border-radius:10px;padding:11px 12px;margin:4px 0;color:var(--txt)">
              <span style="width:38px;height:38px;border-radius:9px;background:var(--surf2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center" [style.color]="v.stCor">
                <span class="material-symbols-outlined" style="font-size:20px">{{ v.tipoIcon }}</span>
              </span>
              <div style="display:flex;flex-direction:column;gap:1px;min-width:0">
                <span class="mono" style="font-size:13.5px;font-weight:500">{{ v.placa }}</span>
                <span style="font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ v.modelo }} · {{ v.motTxt }}</span>
              </div>
              @if (selecionado() === v.placa) {
                <span class="material-symbols-outlined" style="font-size:20px;color:var(--brand)">check_circle</span>
              }
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class VehicleSearchModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  busca = '';
  selecionado = computed(() => this.modal.context());

  resultados() {
    const q = this.busca.toLowerCase();
    return this.store.vehiclesEnriched().filter((v) =>
      !q || v.placa.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q) || v.motTxt.toLowerCase().includes(q));
  }

  escolher(placa: string): void {
    this.modal.onVeiculoEscolhido?.(placa);
    this.modal.close();
  }
}
