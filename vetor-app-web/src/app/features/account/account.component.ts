import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';

type Tab = 'cadastro' | 'integracoes';

@Component({
  selector: 'vetor-account',
  imports: [FormsModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  store = inject(FleetStore);

  tab = signal<Tab>('cadastro');
  form = { ...this.store.account() };
  salvando = signal(false);
  contaErr = signal('');
  hapToken = '';
  hapErr = signal('');

  constructor() {
    // a conta chega da API depois do shell montar (ex.: reload direto em /conta) — sincroniza o form
    effect(() => {
      this.form = { ...this.store.account() };
    });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  async salvarConta(): Promise<void> {
    this.salvando.set(true);
    this.contaErr.set(await this.store.updateAccount(this.form) ?? '');
    this.salvando.set(false);
  }

  hapConectar(): void {
    const err = this.store.hapoloConnect(this.hapToken);
    if (err) {
      this.hapErr.set(err.error);
      return;
    }
    this.hapErr.set('');
    this.hapToken = '';
  }

  hapTestar(): void {
    this.store.hapoloTest();
  }

  hapRemover(): void {
    this.store.hapoloRemove();
  }
}
