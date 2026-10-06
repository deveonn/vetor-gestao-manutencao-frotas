import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { sugerirUsuario } from '../../core/format';

/** Acesso ao app de um motorista (context = id): cria o login de quem não tem, ou redefine a senha. */
@Component({
  selector: 'vetor-driver-access-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:440px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">
          {{ motorista()?.login ? 'Redefinir senha do app' : 'Criar acesso ao app' }}
        </h2>
        <p style="margin:0;color:var(--mut);font-size:13px;line-height:1.55">
          {{ motorista()?.nome }}
          @if (motorista()?.login) {
            — o celular dele sai da conta e pede a senha nova no próximo acesso.
          } @else {
            ainda não tem login no app. Passe o usuário e a senha pra ele.
          }
        </p>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr;gap:14px">
          <label class="field">Usuário
            @if (motorista()?.login) {
              <input [value]="motorista()!.login" disabled>
            } @else {
              <input [(ngModel)]="usuario" placeholder="ex.: joao.prates" autocapitalize="off" spellcheck="false">
            }
          </label>
          <label class="field">{{ motorista()?.login ? 'Nova senha' : 'Senha inicial' }} *
            <input type="text" [(ngModel)]="senha" placeholder="mínimo 6 caracteres" autocomplete="new-password">
          </label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando()">
            {{ salvando() ? 'Salvando…' : motorista()?.login ? 'Redefinir senha' : 'Criar acesso' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DriverAccessModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  motorista = computed(() => this.store.drivers().find((m) => m.id === this.modal.context()) ?? null);
  usuario = sugerirUsuario(this.motorista()?.nome ?? '');
  senha = '';
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();
  salvando = signal(false);

  async salvar(): Promise<void> {
    const m = this.motorista();
    if (!m) return;
    if ((!m.login && !this.usuario.trim()) || this.senha.length < 6) {
      this.erroSig.set(m.login ? 'A senha precisa de pelo menos 6 caracteres.' : 'Informe o usuário e uma senha de pelo menos 6 caracteres.');
      return;
    }
    this.salvando.set(true);
    const erro = await this.store.setDriverAccess(m.id, m.login ? null : this.usuario, this.senha);
    this.salvando.set(false);
    if (erro) {
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }
}
