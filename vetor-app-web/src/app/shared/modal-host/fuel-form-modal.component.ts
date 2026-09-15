import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-fuel-form-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:520px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Registrar abastecimento</h2>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <label class="field">Veículo
            <select [(ngModel)]="veic">
              @for (p of placas(); track p) { <option [value]="p">{{ p }}</option> }
            </select>
          </label>
          <label class="field">Data
            <input type="date" [(ngModel)]="data">
          </label>
          <label class="field">Litros *
            <input inputmode="decimal" [(ngModel)]="litros" placeholder="62,4" class="mono">
          </label>
          <label class="field">Valor total (R$) *
            <input inputmode="decimal" [(ngModel)]="valor" placeholder="387,50" class="mono">
          </label>
          <label class="field">Hodômetro (km) *
            <input inputmode="numeric" [(ngModel)]="hodo" placeholder="121480" class="mono">
          </label>
          <label class="field" style="grid-column:1/-1">Fornecedor
            @if (fornecedores().length > 0) {
              <select [(ngModel)]="fornecedorId">
                @for (f of fornecedores(); track f.id) { <option [ngValue]="f.id">{{ f.nome }}</option> }
              </select>
            } @else {
              <span style="font-size:12.5px;color:var(--dim);padding:10px 0">nenhum fornecedor cadastrado — cadastre um na lista de fornecedores abaixo</span>
            }
          </label>
        </div>
        <p class="mono" style="font-size:11.5px;color:var(--dim);margin:0">o km/L é calculado contra o abastecimento anterior deste veículo</p>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()">Registrar abastecimento</button>
        </div>
      </div>
    </div>
  `,
})
export class FuelFormModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  placas = computed(() => this.store.vehicles().map((v) => v.placa));
  fornecedores = this.store.fornecedores;
  veic = this.placas()[0] ?? '';
  data = '';
  litros = '';
  valor = '';
  hodo = '';
  fornecedorId = this.fornecedores()[0]?.id ?? 0;
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();

  salvar(): void {
    if (!this.litros || !this.valor || !this.hodo) {
      this.erroSig.set('Preencha litros, valor e hodômetro — são obrigatórios para calcular o km/L.');
      return;
    }
    this.store.addFuelEntry({
      veic: this.veic || this.placas()[0],
      litros: parseFloat(String(this.litros).replace(',', '.')) || 0,
      valor: parseFloat(String(this.valor).replace(',', '.')) || 0,
      hodo: parseInt(this.hodo, 10) || 0,
      fornecedorId: this.fornecedorId,
    });
    this.modal.close();
  }
}
