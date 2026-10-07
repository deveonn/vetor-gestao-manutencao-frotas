import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { sugerirUsuario } from '../../core/format';

/**
 * Cadastrar motorista (com o acesso ao app) ou, com context = id, editar o cadastro e excluir.
 * Login e senha de quem já existe ficam no modal "acesso" (redefinir senha / criar acesso).
 */
@Component({
  selector: 'vetor-driver-form-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:480px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">{{ editando() ? 'Editar motorista' : 'Cadastrar motorista' }}</h2>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        @if (confirmandoExclusao()) {
          <div role="alert" class="form-error" style="flex-direction:column;align-items:flex-start;gap:10px">
            <span>
              <b>Excluir {{ editando()?.nome }}?</b> Ele sai da lista e dos alertas, perde o acesso ao app (a sessão no
              celular é encerrada) e o veículo vinculado fica sem motorista. As vistorias que ele fez continuam no histórico.
            </span>
            <div style="display:flex;gap:10px">
              <button class="btn btn-ghost" (click)="confirmandoExclusao.set(false)">Não, voltar</button>
              <button class="btn btn-primary" style="background:var(--crit)" (click)="excluir()" [disabled]="salvando()">Sim, excluir motorista</button>
            </div>
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
          @if (!editando()) {
            <p style="grid-column:1/-1;margin:4px 0 -4px;color:var(--mut);font-size:12.5px;line-height:1.5">
              <b style="color:var(--txt)">Acesso ao app do motorista</b> — passe esses dados pra ele entrar no celular.
            </p>
            <label class="field">Usuário *
              <input [(ngModel)]="usuario" (ngModelChange)="usuarioEditado = true" placeholder="ex.: joao.prates" autocapitalize="off" spellcheck="false">
            </label>
            <label class="field">Senha inicial *
              <input type="text" [(ngModel)]="senha" placeholder="mínimo 6 caracteres" autocomplete="new-password">
            </label>
          }
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          @if (editando()) {
            <button class="btn btn-ghost" style="color:var(--crit)" (click)="confirmandoExclusao.set(true)" [disabled]="confirmandoExclusao()">Excluir motorista</button>
          } @else {
            <span></span>
          }
          <div style="display:flex;gap:10px">
            <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
            <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando()">
              {{ salvando() ? 'Salvando…' : editando() ? 'Salvar alterações' : 'Cadastrar motorista' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DriverFormModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  /** motorista em edição (context = id); null = cadastro novo */
  editando = computed(() => (this.modal.context() ? this.store.drivers().find((m) => m.id === this.modal.context()) ?? null : null));

  nome = this.editando()?.nome ?? '';
  cat = this.editando()?.cat ?? 'B';
  val = this.editando()?.validade ?? '';
  usuario = '';
  senha = '';
  /** enquanto o gestor não mexe no usuário, ele acompanha o nome digitado */
  usuarioEditado = false;
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();
  salvando = signal(false);
  confirmandoExclusao = signal(false);

  onNome(): void {
    if (!this.editando() && !this.usuarioEditado) this.usuario = sugerirUsuario(this.nome);
  }

  async salvar(): Promise<void> {
    if (!this.nome.trim()) {
      this.erroSig.set('Informe o nome do motorista.');
      return;
    }
    const m = this.editando();
    if (!m && (!this.usuario.trim() || this.senha.length < 6)) {
      this.erroSig.set('Informe o usuário e uma senha de pelo menos 6 caracteres pro acesso ao app.');
      return;
    }
    this.salvando.set(true);
    const erro = m
      ? await this.store.updateDriver(m.id, { nome: this.nome, cat: this.cat, val: this.val })
      : await this.store.addDriver({ nome: this.nome, cat: this.cat, val: this.val, usuario: this.usuario, senha: this.senha });
    this.salvando.set(false);
    if (erro) {
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }

  async excluir(): Promise<void> {
    const m = this.editando();
    if (!m) return;
    this.salvando.set(true);
    const erro = await this.store.archiveDriver(m.id);
    this.salvando.set(false);
    if (erro) {
      this.confirmandoExclusao.set(false);
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }
}
