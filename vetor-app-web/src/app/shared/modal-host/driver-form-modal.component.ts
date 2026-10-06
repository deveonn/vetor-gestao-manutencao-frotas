import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { sugerirUsuario } from '../../core/format';

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
            <input [(ngModel)]="nome" (ngModelChange)="onNome()" placeholder="Nome do motorista">
          </label>
          <label class="field">Categoria da CNH
            <select [(ngModel)]="cat">
              <option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
            </select>
          </label>
          <label class="field">Validade da CNH
            <input type="date" [(ngModel)]="val">
          </label>
          <p style="grid-column:1/-1;margin:4px 0 -4px;color:var(--mut);font-size:12.5px;line-height:1.5">
            <b style="color:var(--text)">Acesso ao app do motorista</b> — passe esses dados pra ele entrar no celular.
          </p>
          <label class="field">Usuário *
            <input [(ngModel)]="usuario" (ngModelChange)="usuarioEditado = true" placeholder="ex.: joao.prates" autocapitalize="off" spellcheck="false">
          </label>
          <label class="field">Senha inicial *
            <input type="text" [(ngModel)]="senha" placeholder="mínimo 6 caracteres" autocomplete="new-password">
          </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Cadastrar motorista' }}</button>
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
  usuario = '';
  senha = '';
  /** enquanto o gestor não mexe no usuário, ele acompanha o nome digitado */
  usuarioEditado = false;
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();
  salvando = signal(false);

  onNome(): void {
    if (!this.usuarioEditado) this.usuario = sugerirUsuario(this.nome);
  }

  async salvar(): Promise<void> {
    if (!this.nome.trim()) {
      this.erroSig.set('Informe o nome do motorista.');
      return;
    }
    if (!this.usuario.trim() || this.senha.length < 6) {
      this.erroSig.set('Informe o usuário e uma senha de pelo menos 6 caracteres pro acesso ao app.');
      return;
    }
    this.salvando.set(true);
    const erro = await this.store.addDriver({ nome: this.nome, cat: this.cat, val: this.val, usuario: this.usuario, senha: this.senha });
    this.salvando.set(false);
    if (erro) {
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }
}
