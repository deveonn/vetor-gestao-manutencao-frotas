import { Component, inject, signal } from '@angular/core';
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
  hapToken = '';
  hapErr = signal('');

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  salvarConta(): void {
    this.store.updateAccount(this.form);
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
