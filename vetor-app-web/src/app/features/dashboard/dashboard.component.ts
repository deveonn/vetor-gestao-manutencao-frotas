import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FleetStore } from '../../core/fleet.store';
import { dec, money } from '../../core/format';
import { InstrumentBarComponent } from '../../shared/instrument-bar/instrument-bar.component';
import { ChartComponent } from '../../shared/chart/chart.component';
import { buildDisponibilidadeChart, buildTrendChart } from '../../shared/chart/chart-builders';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'vetor-dashboard',
  imports: [RouterLink, InstrumentBarComponent, ChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  store = inject(FleetStore);
  private router = inject(Router);
  private modal = inject(ModalService);

  dataState = this.store.dataState;
  skel4 = [1, 2, 3, 4];

  private kpiProgress = signal(1);

  constructor() {
    this.countUp();
  }

  private countUp(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.kpiProgress.set(1);
      return;
    }
    const t0 = performance.now();
    this.kpiProgress.set(0);
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      this.kpiProgress.set(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  kCusto = computed(() => money(this.store.kpiTargets().custo * this.kpiProgress()));
  kKml = computed(() => dec(Math.round(this.store.kpiTargets().kmlMedia * 10 * this.kpiProgress()) / 10));
  kDisp = computed(() => Math.round(this.store.kpiTargets().disponiveis * this.kpiProgress()));
  kAlertas = computed(() => Math.round(this.store.kpiTargets().alertasCount * this.kpiProgress()));

  dispSegments = computed(() => {
    const { manutencao, total } = this.store.dispCounts();
    return Array.from({ length: total }, (_, i) => ({ ok: i >= manutencao }));
  });

  trendChart = computed(() => buildTrendChart(
    this.store.kmlWeekly().map((x) => x.lbl),
    this.store.custoWeekly(),
    this.store.kmlWeekly().map((x) => x.val),
  ));

  dispChart = computed(() => {
    const c = this.store.dispCounts();
    return buildDisponibilidadeChart([c.rodando, c.manutencao, c.parado]);
  });

  criticalMaintenance = computed(() => this.store.maintenanceEnriched().find((m) => m.nv === 'critico') ?? null);
  criticalTire = computed(() => this.store.flaggedTiresEnriched().find((p) => p.nv === 'critico') ?? null);

  alertCritCount = computed(() => this.store.alertsEnriched().filter((a) => a.nv === 'critico').length);
  alertAtencaoCount = computed(() => this.store.alertsEnriched().filter((a) => a.nv === 'atencao').length);
  alertInfoCount = computed(() => this.store.alertsEnriched().filter((a) => a.nv === 'info').length);

  retry(): void {
    this.store.retryLoad();
  }

  abrirVeicForm(): void {
    this.modal.open('veic');
  }

  irVeiculo(placa: string): void {
    this.router.navigate(['/veiculos', placa]);
  }

  irAcao(acao: string): void {
    this.router.navigate(['/' + acao]);
  }
}
