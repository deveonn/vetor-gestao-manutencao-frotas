import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FleetStore } from '../../core/fleet.store';
import { dec, intervalo, money } from '../../core/format';
import { InstrumentBarComponent } from '../../shared/instrument-bar/instrument-bar.component';
import { ChartComponent } from '../../shared/chart/chart.component';
import { buildDisponibilidadeChart, buildTrendChart } from '../../shared/chart/chart-builders';
import { ModalService } from '../../core/modal.service';

/** Meta de consumo da frota (km/L). Configuração fixa por enquanto — não há tela nem endpoint pra ela. */
/** Escala das barras de km/L (a mesma do gráfico semanal da tela de combustível). */
const KML_ESCALA = 13;

const DIA_MS = 24 * 60 * 60 * 1000;

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
    // painel sempre fresco ao entrar (o shell carrega uma vez; mutações em outras telas também recarregam)
    this.store.loadDashboard().catch(() => {});
  }

  /** Janelas usadas pelo backend em /relatorios/categorias-semana: últimos 7 dias × os 7 anteriores. */
  periodoAtual = intervalo(new Date(Date.now() - 6 * DIA_MS), new Date());
  periodoAnterior = intervalo(new Date(Date.now() - 13 * DIA_MS), new Date(Date.now() - 7 * DIA_MS));

  custoKpi = computed(() => {
    const { custo, custoAnterior } = this.store.kpiTargets();
    const escala = Math.max(custo, custoAnterior, 1);
    const pct = custoAnterior > 0 ? (custo / custoAnterior - 1) * 100 : null;
    const subiu = custo > custoAnterior;
    return {
      deltaTxt: pct == null ? null : `${pct >= 0 ? '+' : ''}${dec(pct.toFixed(1))}%`,
      pct,
      cor: subiu ? 'var(--warn)' : 'var(--ok)',
      bg: subiu ? 'var(--warn-bg)' : 'var(--ok-bg)',
      barPct: Math.round((custo / escala) * 100),
      markerPct: Math.round((custoAnterior / escala) * 100),
      rodape: custoAnterior > 0
        ? `semana anterior ${money(custoAnterior)} · ${subiu ? '+' : '−'}${money(Math.abs(custo - custoAnterior))}`
        : 'sem gasto registrado na semana anterior',
    };
  });

  kmlKpi = computed(() => {
    const kml = this.store.kpiTargets().kmlMedia;
    // variação: semana atual × anterior da série semanal, só quando as duas têm leitura
    const serie = this.store.kmlWeekly();
    const atual = serie[serie.length - 1]?.val ?? null;
    const anterior = serie[serie.length - 2]?.val ?? null;
    const d = atual != null && anterior != null ? Math.round((atual - anterior) * 10) / 10 : null;
    return {
      deltaTxt: d == null ? null : `${d >= 0 ? '▲' : '▼'} ${dec(Math.abs(d).toFixed(1))}`,
      cor: d != null && d < 0 ? 'var(--warn)' : 'var(--ok)',
      bg: d != null && d < 0 ? 'var(--warn-bg)' : 'var(--ok-bg)',
      pct: Math.min(100, Math.round((kml / KML_ESCALA) * 100)),
      markerPct: Math.min(100, Math.round((this.store.metaKml() / KML_ESCALA) * 100)),
      metaTxt: `meta ${dec(this.store.metaKml().toFixed(1))} km/L`,
      naMeta: kml >= this.store.metaKml(),
    };
  });

  /** Categoria que mais subiu em R$ na semana, se alguma subiu. */
  private maiorAlta = computed(() => {
    const altas = this.store.weekCategories().map((c) => ({ n: c.n, diff: c.atu - c.ant })).filter((c) => c.diff > 0);
    return altas.sort((a, b) => b.diff - a.diff)[0] ?? null;
  });

  resumoVariacao = computed(() => {
    const { pct } = this.custoKpi();
    if (pct == null) return 'sem base de comparação com a semana anterior';
    const alta = this.maiorAlta();
    const rel = `${Math.abs(Math.round(pct))}% ${pct >= 0 ? 'acima' : 'abaixo'} da anterior`;
    return pct > 0 && alta ? `${rel}, puxado por ${alta.n.toLowerCase()}` : rel;
  });

  destaque = computed(() => {
    const { custo, custoAnterior } = this.store.kpiTargets();
    const alta = this.maiorAlta();
    if (alta) return { titulo: `${alta.n} puxou a alta:`, texto: `+${money(alta.diff)} em relação a ${this.periodoAnterior}.` };
    if (custo < custoAnterior) return { titulo: 'Custo em queda:', texto: `${money(custoAnterior - custo)} a menos que em ${this.periodoAnterior}.` };
    return { titulo: 'Sem variação:', texto: 'o custo por categoria ficou igual ao da semana anterior.' };
  });

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
