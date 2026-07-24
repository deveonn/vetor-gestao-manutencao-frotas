import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { dec, money } from '../../core/format';

type SortKey = 'data' | 'litros' | 'valor' | 'kml';

@Component({
  selector: 'vetor-fuel',
  templateUrl: './fuel.component.html',
  styleUrl: './fuel.component.scss',
})
export class FuelComponent {
  store = inject(FleetStore);
  private modal = inject(ModalService);
  private router = inject(Router);

  sortKey = signal<SortKey>('data');
  sortDir = signal(1);

  resumo = computed(() => {
    const entries = this.store.fuelEntries();
    const litros = entries.reduce((s, r) => s + r.l, 0);
    const valor = entries.reduce((s, r) => s + r.val, 0);
    const precoMedio = litros ? valor / litros : 0;
    return { litros, valor, precoMedio };
  });

  abSorted = computed(() => {
    const k = this.sortKey(), dir = this.sortDir();
    const list = this.store.fuelEnriched();
    return [...list].sort((a, b) => {
      const va = k === 'data' ? a.i : k === 'litros' ? a.l : k === 'valor' ? a.val : (a.kml ?? 0);
      const vb = k === 'data' ? b.i : k === 'litros' ? b.l : k === 'valor' ? b.val : (b.kml ?? 0);
      return (va - vb) * (k === 'data' ? dir : -dir);
    }).map((r, i) => ({ ...r, zebra: i % 2 ? 'var(--surf2)' : 'transparent' }));
  });

  bars = this.store.weeklyBars;

  anomalo = computed(() => this.store.fuelEnriched().find((r) => r.anom) ?? null);

  sortBy(k: SortKey): void {
    if (this.sortKey() === k) this.sortDir.update((d) => -d);
    else { this.sortKey.set(k); this.sortDir.set(1); }
  }

  seta(col: SortKey): string {
    return this.sortKey() === col ? (this.sortDir() === 1 ? ' ↓' : ' ↑') : '';
  }

  fmtMoney = money;
  fmtDec = dec;

  abrirAbast(): void {
    this.modal.open('abast');
  }

  irManutencao(): void {
    this.router.navigate(['/manutencao']);
  }
}
