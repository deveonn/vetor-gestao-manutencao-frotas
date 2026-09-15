import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-fornecedor-form-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:480px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Cadastrar fornecedor</h2>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <label class="field" style="grid-column:1/-1">Nome *
            <input [(ngModel)]="nome" placeholder="Ipiranga BR-116">
          </label>
          <label class="field" style="grid-column:1/-1">Endereço
            <input [(ngModel)]="endereco" placeholder="BR-116, km 234">
          </label>
          <label class="field">Cidade
            <input [(ngModel)]="cidade" placeholder="Guarulhos">
          </label>
          <label class="field">Telefone
            <input [(ngModel)]="telefone" placeholder="(11) 4123-5566" class="mono">
          </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()">Cadastrar fornecedor</button>
        </div>
      </div>
    </div>
  `,
})
export class FornecedorFormModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  nome = '';
  endereco = '';
  cidade = '';
  telefone = '';
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();

  salvar(): void {
    if (!this.nome.trim()) {
      this.erroSig.set('Informe o nome do fornecedor.');
      return;
    }
    this.store.addFornecedor({ nome: this.nome, endereco: this.endereco, cidade: this.cidade, telefone: this.telefone });
    this.modal.close();
  }
}
