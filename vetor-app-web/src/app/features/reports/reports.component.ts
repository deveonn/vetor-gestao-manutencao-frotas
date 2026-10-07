import { Component, computed, inject, signal } from '@angular/core';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';
import { ToastService } from '../../core/toast.service';
import { ReportId, ReportScope } from '../../core/models';
import { dataCurta, dec, nomeMes } from '../../core/format';
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
  relatorioGerado = signal<ReportId | null>(null);
  geradoEm = signal('');

  constructor() {
    this.store.loadReports().catch(() => {});
  }

  // comparativo mensal: mês anterior × mês atual (até hoje) — mesmo par pedido em FleetStore.loadReports
  private hoje = new Date();
  private idxAtual = this.hoje.getMonth();
  private idxAnterior = (this.idxAtual + 11) % 12;
  mesAtualCurto = nomeMes(this.idxAtual, true);
  mesAnteriorCurto = nomeMes(this.idxAnterior, true);

  reportDefs = computed<ReportDef[]>(() => [
    { id: 'comparativo', titulo: 'Comparativo de custos', desc: `Custo por categoria ${this.mesAnteriorCurto} × ${this.mesAtualCurto}, com projeção de fechamento.`, icon: 'compare_arrows', periodo: `${this.mesAnteriorCurto} × ${this.mesAtualCurto} ${this.hoje.getFullYear()}`, linhas: `${this.store.reportCategories().length} categorias` },
    { id: 'veiculo', titulo: 'Custo por veículo', desc: 'Rateio de km rodados, custo total e R$/km de cada veículo.', icon: 'local_shipping', periodo: 'últimos 30 dias', linhas: `${this.store.reportCosts().length} veículos` },
    { id: 'consumo', titulo: 'Consumo e eficiência', desc: 'km/L por veículo, ordenado do mais eficiente ao mais gastador.', icon: 'speed', periodo: 'agora', linhas: `${this.store.vehicles().length} veículos` },
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
      cor: v.kml >= this.store.metaKml() ? 'var(--ok)' : v.kml >= this.store.kmlBaixo() ? 'var(--warn)' : 'var(--crit)',
      lbl: v.kml >= this.store.metaKml() ? 'eficiente' : v.kml >= this.store.kmlBaixo() ? 'na média' : 'abaixo',
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

  /** Projeção linear do mês atual (gasto até hoje ÷ dias corridos × dias do mês) contra o mês anterior. */
  projecao = computed(() => {
    const cats = this.store.reportCategories();
    const totalAnt = cats.reduce((s, c) => s + c.ant, 0);
    const mesAtual = nomeMes(this.idxAtual);
    const mesAnterior = nomeMes(this.idxAnterior);
    if (totalAnt <= 0) return `Sem gasto registrado em ${mesAnterior} para comparar a projeção de ${mesAtual}.`;
    const diasNoMes = new Date(this.hoje.getFullYear(), this.idxAtual + 1, 0).getDate();
    const fator = diasNoMes / this.hoje.getDate();
    const projetadas = cats.map((c) => ({ n: c.n, diff: c.atu * fator - c.ant }));
    const totalProj = cats.reduce((s, c) => s + c.atu * fator, 0);
    const pct = (totalProj / totalAnt - 1) * 100;
    const fatorPrincipal = [...projetadas].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
    const cap = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
    return `${cap} projeta fechar ${dec(Math.abs(pct).toFixed(0))}% ${pct >= 0 ? 'acima' : 'abaixo'} de ${mesAnterior} se o ritmo se mantiver — ${fatorPrincipal.n.toLowerCase()} é o principal fator ${fatorPrincipal.diff >= 0 ? 'da alta' : 'da queda'}.`;
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

  /** Os dados já estão carregados da API (loadReports) — gerar é só mostrar, sem espera. */
  gerar(): void {
    this.geradoEm.set(dataCurta(new Date().toISOString()));
    this.relatorioGerado.set(this.tipoSelecionado());
  }

  trocar(): void {
    this.relatorioGerado.set(null);
  }

  /** Tabela do relatório na tela (com o escopo aplicado) — base do CSV. */
  private tabela(): { cab: string[]; linhas: (string | number | null)[][] } {
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b - 1) * 1000) / 10 : null);
    switch (this.relDef().id) {
      case 'comparativo':
        return {
          cab: ['Categoria', `${this.mesAnteriorCurto} (R$)`, `${this.mesAtualCurto} (R$)`, 'Variação (%)'],
          linhas: this.store.reportCategories().map((c) => [c.n, c.ant, c.atu, pct(c.atu, c.ant)]),
        };
      case 'veiculo':
        return { cab: ['Placa', 'Km rodados', 'Custo (R$)', 'R$/km'], linhas: this.relFilt().map((r) => [r.placa, r.km, r.custo, r.ckm]) };
      case 'consumo':
        return { cab: ['Placa', 'Modelo', 'km/L', 'Situação'], linhas: this.relConsumo().map((r) => [r.placa, r.modelo, r.kml, r.lbl]) };
      case 'disponibilidade':
        return { cab: ['Status', 'Veículos', '%'], linhas: this.relDisp().map((d) => [d.k, d.n, d.pct]) };
      case 'manutencao':
        return {
          cab: ['Placa', 'Serviço', 'Prazo', 'Urgência'],
          linhas: this.manFilt().map((m) => [m.v, m.item, m.prazo, m.nv === 'critico' ? 'crítico' : m.nv === 'atencao' ? 'atenção' : 'ok']),
        };
    }
  }

  /** CSV no formato que o Excel em português abre direto: ";" entre colunas, vírgula decimal, UTF-8 com BOM. */
  exportCsv(): void {
    const { cab, linhas } = this.tabela();
    const cel = (v: string | number | null) => {
      if (v == null) return '';
      const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cab, ...linhas].map((l) => l.map(cel).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vetor-${this.relDef().id}-${this.escopoArquivo()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast.show(`CSV baixado — ${this.relDef().titulo.toLowerCase()}`);
  }

  private escopoArquivo(): string {
    return this.escopo() === 'veiculo' && this.veiculoSelecionado() ? this.veiculoSelecionado()!.toLowerCase() : 'frota';
  }

  /** PDF pela impressão do navegador ("Salvar como PDF"): o CSS de impressão (styles.scss) deixa só o relatório. */
  exportPdf(): void {
    window.print();
  }
}
