import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

type Filtro = 'todos' | 'alerta' | 'rodando' | 'parado' | 'manutencao';

const CHIPS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'alerta', label: 'Com alerta' },
  { id: 'rodando', label: 'Rodando' },
  { id: 'parado', label: 'Parados' },
  { id: 'manutencao', label: 'Em manutenção' },
];

@Component({
  selector: 'vetor-vehicle-list',
  imports: [FormsModule],
  templateUrl: './vehicle-list.component.html',
  styleUrl: './vehicle-list.component.scss',
})
export class VehicleListComponent {
  store = inject(FleetStore);
  private modal = inject(ModalService);
  private router = inject(Router);

  q = '';
  filtro = signal<Filtro>('todos');
  chips = CHIPS;

  vList() {
    const q = this.q.toLowerCase();
    const f = this.filtro();
    return this.store.vehiclesEnriched().filter((v) =>
      (!q || v.placa.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q) || v.motTxt.toLowerCase().includes(q)) &&
      (f === 'todos' || (f === 'alerta' && v.temAlerta) || (f === 'rodando' && v.status === 'rodando') ||
        (f === 'parado' && v.status === 'parado') || (f === 'manutencao' && v.status === 'manutencao')));
  }

  setFiltro(f: Filtro): void {
    this.filtro.set(f);
  }

  abrir(placa: string): void {
    this.router.navigate(['/veiculos', placa]);
  }

  abrirVeicForm(): void {
    this.modal.open('veic');
  }
}
