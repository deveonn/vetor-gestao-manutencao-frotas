import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-driver-form-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:480px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Cadastrar motorista</h2>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <label class="field" style="grid-column:1/-1">Nome completo *
            <input [(ngModel)]="nome" placeholder="Nome do motorista">
          </label>
          <label class="field">Categoria da CNH
            <select [(ngModel)]="cat">
              <option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
            </select>
          </label>
          <label class="field">Validade da CNH
            <input type="date" [(ngModel)]="val">
          </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()">Cadastrar motorista</button>
        </div>
      </div>
    </div>
  `,
})
export class DriverFormModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  nome = '';
  cat = 'B';
  val = '';
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();

  salvar(): void {
    if (!this.nome) {
      this.erroSig.set('Informe o nome do motorista.');
      return;
    }
    this.store.addDriver({ nome: this.nome, cat: this.cat, val: this.val || '—' });
    this.modal.close();
  }
}
