import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { fmt } from '../../core/format';

/** Agendar manutenção (context = placa já escolhida, ex.: aberto pelo detalhe do veículo). */
@Component({
  selector: 'vetor-maintenance-form-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:500px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Agendar manutenção</h2>
        <p style="margin:0;color:var(--mut);font-size:13px;line-height:1.55">
          Vence no que chegar primeiro: o km ou a data. A urgência atualiza sozinha conforme o hodômetro sobe.
        </p>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <label class="field">Veículo *
            <select [ngModel]="placa()" (ngModelChange)="placa.set($event)">
              <option value="">Escolha…</option>
              @for (v of store.vehicles(); track v.id) {
                <option [value]="v.placa">{{ v.placa }} — {{ v.modelo }}</option>
              }
            </select>
          </label>
          <label class="field">Serviço *
            <input [(ngModel)]="item" list="servicos-plano" placeholder="ex.: Troca de óleo e filtro">
            <datalist id="servicos-plano">
              @for (s of sugestoes(); track s) { <option [value]="s"></option> }
            </datalist>
          </label>
          <label class="field">Daqui a quantos km
            <input type="number" min="0" step="100" [ngModel]="km()" (ngModelChange)="km.set($event)" placeholder="ex.: 5000">
          </label>
          <label class="field">Data limite
            <input type="date" [(ngModel)]="data">
          </label>
          @if (veiculo(); as v) {
            <p class="mono" style="grid-column:1/-1;margin:-4px 0 0;color:var(--dim);font-size:11.5px">
              hodômetro atual {{ fmt(v.hod) }} km
              @if (km() != null && km()! >= 0) { · meta em {{ fmt(v.hod + +km()!) }} km }
            </p>
          }
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Agendar manutenção' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class MaintenanceFormModalComponent {
  modal = inject(ModalService);
  store = inject(FleetStore);
  fmt = fmt;

  placa = signal(this.modal.context() ?? '');
  km = signal<number | null>(null);
  item = '';
  data = '';
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();
  salvando = signal(false);

  veiculo = computed(() => this.store.vehicles().find((v) => v.placa === this.placa()) ?? null);
  /** serviços do plano do tipo do veículo escolhido (ou de todos os planos, sem veículo) */
  sugestoes = computed(() => {
    const tipo = this.veiculo()?.tipo;
    const itens = this.store.plans().filter((p) => !tipo || p.tipo === tipo).flatMap((p) => p.itens.map((i) => i.item));
    return [...new Set(itens)];
  });

  async salvar(): Promise<void> {
    const km = this.km() === null || (this.km() as unknown) === '' ? null : Number(this.km());
    if (!this.placa() || !this.item.trim()) {
      this.erroSig.set('Escolha o veículo e informe o serviço.');
      return;
    }
    if (km == null && !this.data) {
      this.erroSig.set('Informe daqui a quantos km e/ou a data limite.');
      return;
    }
    if (km != null && (!Number.isFinite(km) || km < 0)) {
      this.erroSig.set('O km precisa ser um número positivo.');
      return;
    }
    this.salvando.set(true);
    const erro = await this.store.addMaintenance({ placa: this.placa(), item: this.item, km, data: this.data });
    this.salvando.set(false);
    if (erro) {
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }
}
