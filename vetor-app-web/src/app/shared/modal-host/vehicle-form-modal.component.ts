import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { VehicleType } from '../../core/models';

@Component({
  selector: 'vetor-vehicle-form-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:480px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Adicionar veículo</h2>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <label class="field">Placa *
            <input [(ngModel)]="placa" placeholder="ABC-1D23" class="mono" style="text-transform:uppercase">
          </label>
          <label class="field">Modelo
            <input [(ngModel)]="modelo" placeholder="Fiat Fiorino">
          </label>
          <label class="field" style="grid-column:1/-1">Tipo
            <select [(ngModel)]="tipo">
              <option value="Utilitário">Utilitário</option>
              <option value="Van de carga">Van de carga</option>
              <option value="Caminhão leve">Caminhão leve</option>
            </select>
          </label>
        </div>
        <p class="mono" style="font-size:11.5px;color:var(--dim);margin:0">a telemetria conecta automaticamente quando o rastreador reportar esta placa</p>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Adicionar veículo' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class VehicleFormModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  placa = '';
  modelo = '';
  tipo: VehicleType = 'Utilitário';
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();
  salvando = signal(false);

  async salvar(): Promise<void> {
    if (!this.placa.trim()) {
      this.erroSig.set('Informe a placa do veículo.');
      return;
    }
    this.salvando.set(true);
    const erro = await this.store.addVehicle({ placa: this.placa, modelo: this.modelo, tipo: this.tipo });
    this.salvando.set(false);
    if (erro) {
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }
}
