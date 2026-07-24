import { Component, computed, inject, signal } from '@angular/core';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { ToastService } from '../../core/toast.service';
import { ReportId, ReportScope } from '../../core/models';
import { ChartComponent } from '../../shared/chart/chart.component';
import { buildDisponibilidadeChart } from '../../shared/chart/chart-builders';

interface ReportDef {
  id: ReportId;
  titulo: string;
  desc: string;
  icon: string;
  periodo: string;
  linhas: string;
}

@Component({
  selector: 'vetor-reports',
  imports: [ChartComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  store = inject(FleetStore);
  private modal = inject(ModalService);
  private toast = inject(ToastService);

  tipoSelecionado = signal<ReportId>('comparativo');
  escopo = signal<ReportScope>('frota');
  veiculoSelecionado = signal<string | null>(null);
  gerando = signal(false);
  relatorioGerado = signal<ReportId | null>(null);

  reportDefs = computed<ReportDef[]>(() => [
    { id: 'comparativo', titulo: 'Comparativo de custos', desc: 'Custo por categoria jun × jul, com projeção de fechamento.', icon: 'compare_arrows', periodo: 'jun × jul 2026', linhas: '3 categorias' },
    { id: 'veiculo', titulo: 'Custo por veículo', desc: 'Rateio de km rodados, custo total e R$/km de cada veículo.', icon: 'local_shipping', periodo: 'julho 2026', linhas: `${this.store.reportCosts().length} veículos` },
    { id: 'consumo', titulo: 'Consumo e eficiência', desc: 'km/L por veículo, ordenado do mais eficiente ao mais gastador.', icon: 'speed', periodo: 'julho 2026', linhas: `${this.store.vehicles().length} veículos` },
    { id: 'disponibilidade', titulo: 'Disponibilidade da frota', desc: 'Distribuição entre rodando, em manutenção e parado.', icon: 'donut_large', periodo: 'agora', linhas: `${this.store.vehicles().length} veículos` },
    { id: 'manutencao', titulo: 'Manutenções previstas', desc: 'Trocas e revisões agendadas por prazo e prioridade.', icon: 'build', periodo: 'próximos 30 dias', linhas: `${this.store.maintenanceItems().length} pendências` },
  ]);

  escopoLabel = computed(() => this.escopo() === 'veiculo' && this.veiculoSelecionado()
    ? `veículo ${this.veiculoSelecionado()}` : 'frota inteira');

  private escopoFiltro(placa: string): boolean {
    return this.escopo() !== 'veiculo' || !this.veiculoSelecionado() || placa === this.veiculoSelecionado();
  }

  relFilt = computed(() => this.store.reportCostsEnriched().filter((r) => this.escopoFiltro(r.placa)));
  manFilt = computed(() => this.store.maintenanceEnriched().filter((m) => this.escopoFiltro(m.v)));

  relConsumo = computed(() => this.store.vehiclesEnriched()
    .filter((v) => this.escopoFiltro(v.placa))
    .map((v) => ({
      placa: v.placa, modelo: v.modelo, kmlF: v.kmlF, kml: v.kml,
      pct: Math.min(100, Math.round((v.kml / 13) * 100)),
      cor: v.kml >= 9 ? 'var(--ok)' : v.kml >= 7 ? 'var(--warn)' : 'var(--crit)',
      lbl: v.kml >= 9 ? 'eficiente' : v.kml >= 7 ? 'na média' : 'abaixo',
    }))
    .sort((a, b) => b.kml - a.kml));

  private veicEscopo = computed(() => this.store.vehiclesEnriched().filter((v) => this.escopoFiltro(v.placa)));

  relDisp = computed(() => {
    const vs = this.veicEscopo();
    const rodando = vs.filter((v) => v.status === 'rodando').length;
    const manutencao = vs.filter((v) => v.status === 'manutencao').length;
    const parado = vs.filter((v) => v.status === 'parado').length;
    const total = vs.length || 1;
    return [
      { k: 'Rodando', n: rodando, cor: 'var(--ok)', icon: 'check_circle', pct: Math.round((rodando / total) * 100) },
      { k: 'Em manutenção', n: manutencao, cor: 'var(--warn)', icon: 'build', pct: Math.round((manutencao / total) * 100) },
      { k: 'Parado', n: parado, cor: 'var(--dim)', icon: 'pause_circle', pct: Math.round((parado / total) * 100) },
    ];
  });

  dispChart = computed(() => {
    const d = this.relDisp();
    return buildDisponibilidadeChart([d[0].n, d[1].n, d[2].n]);
  });

  relDef = computed(() => this.reportDefs().find((d) => d.id === (this.relatorioGerado() ?? this.tipoSelecionado()))!);

  escolherTipo(id: ReportId): void {
    this.tipoSelecionado.set(id);
  }

  setEscopo(e: ReportScope): void {
    if (e === 'veiculo') {
      this.escopo.set('veiculo');
      this.abrirBuscaVeic();
    } else {
      this.escopo.set('frota');
      this.veiculoSelecionado.set(null);
    }
  }

  abrirBuscaVeic(): void {
    this.modal.onVeiculoEscolhido = (placa) => this.veiculoSelecionado.set(placa);
    this.modal.open('buscaVeic', this.veiculoSelecionado());
  }

  gerar(): void {
    this.gerando.set(true);
    setTimeout(() => {
      this.gerando.set(false);
      this.relatorioGerado.set(this.tipoSelecionado());
    }, 650);
  }

  trocar(): void {
    this.relatorioGerado.set(null);
  }

  exportCsv(): void {
    this.toast.show(`Relatório exportado (CSV) — ${this.relDef().titulo.toLowerCase()}`);
  }

  exportPdf(): void {
    this.toast.show(`Relatório exportado (PDF) — ${this.relDef().titulo.toLowerCase()}`);
  }
}
