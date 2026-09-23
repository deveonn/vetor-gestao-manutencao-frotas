import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { dec, fmt, money } from './format';
import {
  MOCK_ALERTS, MOCK_CUSTO_SEMANAL, MOCK_DRIVERS, MOCK_FLAGGED_TIRES, MOCK_FORNECEDORES,
  MOCK_FUEL, MOCK_INSPECTIONS, MOCK_KML_SEMANAL, MOCK_MAINTENANCE, MOCK_MAINTENANCE_HISTORY, MOCK_PLANS,
  MOCK_REPORT_CATEGORIES, MOCK_REPORT_COSTS, MOCK_VEHICLES, MOCK_WEEK_CATEGORIES,
} from './mock-data';
import { AlertLevel, CompanyAccount, DataState, Driver, Fornecedor, FuelEntry, HapoloStatus, Severity, Vehicle } from './models';
import { ToastService } from './toast.service';

const SEVERITY_COLOR: Record<AlertLevel, string> = {
  ok: 'var(--ok)',
  atencao: 'var(--warn)',
  critico: 'var(--crit)',
  info: 'var(--brand)',
};
const SEVERITY_GLYPH: Record<AlertLevel, string> = {
  ok: 'check_circle',
  atencao: 'warning',
  critico: 'error',
  info: 'info',
};
const TIRE_POS_CODE = ['DE', 'DD', 'TE', 'TD'];
const TIRE_POS_NAME = ['Dianteiro esquerdo', 'Dianteiro direito', 'Traseiro esquerdo', 'Traseiro direito'];

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

function tipoIcone(tipo: Vehicle['tipo']): string {
  if (tipo === 'Van de carga') return 'airport_shuttle';
  if (tipo === 'Caminhão leve') return 'local_shipping';
  return 'directions_car';
}

/** Empresa como vem de GET/PATCH /empresa (nomes do schema Prisma). */
interface EmpresaApi {
  nome: string;
  cnpj: string;
  contatoNome: string;
  contatoEmail: string;
  contatoFone: string;
}

function paraConta(e: EmpresaApi): CompanyAccount {
  return { empresa: e.nome, cnpj: e.cnpj, nome: e.contatoNome, email: e.contatoEmail, fone: e.contatoFone };
}

function paraEmpresaApi(c: Partial<CompanyAccount>): Partial<EmpresaApi> {
  const body: Partial<EmpresaApi> = {};
  if (c.empresa !== undefined) body.nome = c.empresa;
  if (c.cnpj !== undefined) body.cnpj = c.cnpj;
  if (c.nome !== undefined) body.contatoNome = c.nome;
  if (c.email !== undefined) body.contatoEmail = c.email;
  if (c.fone !== undefined) body.contatoFone = c.fone;
  return body;
}

const CONTA_VAZIA: CompanyAccount = { empresa: '', cnpj: '', nome: '', email: '', fone: '' };

function severityColor(s: Severity | AlertLevel): string {
  return SEVERITY_COLOR[s as AlertLevel] ?? SEVERITY_COLOR.ok;
}

@Injectable({ providedIn: 'root' })
export class FleetStore {
  // --- dados brutos ---
  readonly vehicles = signal<Vehicle[]>(MOCK_VEHICLES);
  readonly alerts = signal(MOCK_ALERTS);
  readonly fuelEntries = signal<FuelEntry[]>(MOCK_FUEL);
  readonly kmlWeekly = signal(MOCK_KML_SEMANAL);
  readonly custoWeekly = signal(MOCK_CUSTO_SEMANAL);
  readonly maintenanceItems = signal(MOCK_MAINTENANCE);
  readonly maintenanceHistory = signal(MOCK_MAINTENANCE_HISTORY);
  readonly plans = signal(MOCK_PLANS);
  readonly flaggedTires = signal(MOCK_FLAGGED_TIRES);
  readonly inspections = signal(MOCK_INSPECTIONS);
  readonly drivers = signal<Driver[]>(MOCK_DRIVERS);
  readonly fornecedores = signal<Fornecedor[]>(MOCK_FORNECEDORES);
  readonly reportCosts = signal(MOCK_REPORT_COSTS);
  /** Vem da API (GET /empresa) — carregada pelo shell ao entrar no painel. */
  readonly account = signal<CompanyAccount>(CONTA_VAZIA);
  readonly hapoloStatus = signal<HapoloStatus>('conectado');
  readonly hapoloValidating = signal(false);
  readonly hapoloTokenTail = signal('x4T9');

  /** Estado real de carregamento — 'vazio' é derivado automaticamente da lista de veículos. */
  private readonly dataStateRaw = signal<DataState>('carregando');
  readonly dataState = computed<DataState>(() => {
    const raw = this.dataStateRaw();
    if (raw === 'normal' && this.vehicles().length === 0) return 'vazio';
    return raw;
  });
  /** Rastreamento Hapolo indisponível quando não há token conectado. */
  readonly offline = computed(() => this.hapoloStatus() === 'sem');

  private http = inject(HttpClient);

  constructor(private toast: ToastService) {
    setTimeout(() => this.dataStateRaw.set('normal'), 900);
  }

  // --- veículos enriquecidos ---
  readonly vehiclesEnriched = computed(() => this.vehicles().map((v) => {
    const combCor = v.comb < 25 ? SEVERITY_COLOR.critico : v.comb < 40 ? SEVERITY_COLOR.atencao : 'var(--brand)';
    const trocaCor = v.troca < 0 ? SEVERITY_COLOR.critico : v.troca < 1500 ? SEVERITY_COLOR.atencao : SEVERITY_COLOR.ok;
    return {
      ...v,
      hodF: fmt(v.hod),
      kmlF: dec(v.kml),
      kmHojeF: fmt(v.kmHoje),
      stCor: v.status === 'rodando' ? SEVERITY_COLOR.ok : v.status === 'manutencao' ? SEVERITY_COLOR.atencao : 'var(--dim)',
      stLabel: v.status === 'rodando' ? 'rodando' : v.status === 'manutencao' ? 'em manutenção' : 'parado',
      combCor,
      trocaTxt: v.troca < 0 ? `vencida há ${fmt(-v.troca)} km` : `em ${fmt(v.troca)} km`,
      trocaCor,
      trocaPct: clamp(4, 100, Math.round(100 - (v.troca / 10000) * 100)),
      pneuDots: v.pneus.map((p, i) => ({
        pos: TIRE_POS_CODE[i], nome: TIRE_POS_NAME[i], cor: severityColor(p),
        lbl: p === 'ok' ? 'ok' : p === 'atencao' ? 'atenção' : 'sinalizado',
      })),
      motTxt: v.mot || 'sem motorista',
      tipoIcon: tipoIcone(v.tipo),
      temAlerta: v.troca < 1500 || v.pneus.some((p) => p !== 'ok') || v.kml < 7,
    };
  }));

  readonly dispCounts = computed(() => {
    const vs = this.vehiclesEnriched();
    return {
      rodando: vs.filter((v) => v.status === 'rodando').length,
      manutencao: vs.filter((v) => v.status === 'manutencao').length,
      parado: vs.filter((v) => v.status === 'parado').length,
      total: vs.length,
    };
  });

  readonly kpiTargets = computed(() => {
    const custo = MOCK_WEEK_CATEGORIES.reduce((sum, c) => sum + c.atu, 0);
    const kmlSerie = this.kmlWeekly();
    const kmlMedia = kmlSerie.length ? kmlSerie[kmlSerie.length - 1].val : 0;
    const { manutencao, total } = this.dispCounts();
    return {
      custo,
      kmlMedia,
      disponiveis: total - manutencao,
      totalVeiculos: total,
      alertasCount: this.alerts().length,
    };
  });

  readonly categoriesWithDelta = computed(() => MOCK_WEEK_CATEGORIES.map((c) => {
    const d = Math.round((c.atu / c.ant - 1) * 100);
    return {
      ...c,
      atuF: money(c.atu),
      antF: money(c.ant),
      pctAtu: Math.round((c.atu / 14000) * 100),
      pctAnt: Math.round((c.ant / 14000) * 100),
      delta: (d >= 0 ? '+' : '') + d + '%',
      dCor: d > 25 ? 'var(--crit)' : d > 8 ? 'var(--warn)' : 'var(--mut)',
    };
  }));

  readonly alertsEnriched = computed(() => this.alerts().map((a) => ({
    ...a,
    cor: SEVERITY_COLOR[a.nv],
    glifo: SEVERITY_GLYPH[a.nv],
    bg: a.nv === 'critico' ? 'var(--crit-bg)' : a.nv === 'atencao' ? 'var(--warn-bg)' : 'var(--brand-bg)',
    nvLbl: a.nv === 'critico' ? 'crítico' : a.nv === 'atencao' ? 'atenção' : 'informativo',
  })));

  readonly fuelEnriched = computed(() => {
    const fornecedores = this.fornecedores();
    return this.fuelEntries().map((r, i) => ({
      ...r,
      i,
      lF: dec(r.l.toFixed(1)),
      valF: 'R$ ' + dec(r.val.toFixed(2)),
      hodF: fmt(r.hod),
      kmlF: r.kml == null ? '—' : dec(r.kml),
      kmlCor: r.anom ? 'var(--warn)' : 'var(--txt)',
      postoNome: fornecedores.find((f) => f.id === r.fornecedorId)?.nome ?? '—',
    }));
  });

  readonly fornecedoresEnriched = computed(() => {
    const usos = this.fuelEntries();
    return this.fornecedores().map((f) => ({
      ...f,
      enderecoTxt: f.endereco ? `${f.endereco} · ${f.cidade}` : f.cidade || '—',
      telefoneTxt: f.telefone || '—',
      qtdAbastecimentos: usos.filter((r) => r.fornecedorId === f.id).length,
    }));
  });

  readonly weeklyBars = computed(() => this.kmlWeekly().map((x) => ({
    ...x,
    valF: dec(x.val),
    hPct: Math.round((x.val / 13) * 100),
    cor: x.val < 7.6 ? 'var(--warn)' : 'var(--brand)',
  })));

  readonly maintenanceEnriched = computed(() => this.maintenanceItems().map((m) => ({
    ...m,
    cor: SEVERITY_COLOR[m.nv],
    glifo: SEVERITY_GLYPH[m.nv],
    pct: clamp(4, 100, Math.round(100 - (m.resta / 10000) * 100)),
  })));

  readonly maintenanceHistoryEnriched = computed(() => this.maintenanceHistory().map((h) => ({
    ...h,
    custoF: money(h.custo),
  })));

  readonly flaggedTiresEnriched = computed(() => this.flaggedTires().map((p) => ({
    ...p,
    cor: SEVERITY_COLOR[p.nv],
    glifo: SEVERITY_GLYPH[p.nv],
    bg: p.nv === 'critico' ? 'var(--crit-bg)' : 'var(--warn-bg)',
    nvLbl: p.nv === 'critico' ? 'trocar agora' : 'monitorar',
  })));

  readonly inspectionsEnriched = computed(() => this.inspections().map((vi) => ({
    ...vi,
    itens: vi.itens.map((it) => ({
      ...it,
      glifo: it.ok ? 'check_circle' : 'error',
      cor: it.ok ? 'var(--ok)' : 'var(--crit)',
      lbl: it.ok ? 'ok' : it.obs,
    })),
  })));

  readonly driversEnriched = computed(() => this.drivers().map((m) => ({
    ...m,
    vTxt: m.v || 'sem vínculo',
    desdeTxt: m.desde ? `desde ${m.desde}` : '—',
    cnhCor: m.dias != null && m.dias <= 30 ? 'var(--warn)' : 'var(--ok)',
    cnhTxt: m.dias != null && m.dias <= 30 ? `vence em ${m.dias} dias` : 'em dia',
    cnhBg: m.dias != null && m.dias <= 30 ? 'var(--warn-bg)' : 'var(--ok-bg)',
  })));

  readonly reportCostsEnriched = computed(() => this.reportCosts().map((r) => ({
    ...r,
    kmF: fmt(r.km),
    custoF: money(r.custo),
    ckmF: 'R$ ' + dec((r.custo / r.km).toFixed(2)),
  })));

  readonly reportCategoriesEnriched = computed(() => MOCK_REPORT_CATEGORIES.map((c) => ({
    ...c,
    junF: money(c.jun),
    julF: money(c.jul),
    pctJun: Math.round((c.jun / 45000) * 100),
    pctJul: Math.round((c.jul / 45000) * 100),
  })));

  findVehicleByPlaca(placa: string) {
    return this.vehiclesEnriched().find((v) => v.placa === placa) ?? null;
  }

  // --- mutações ---
  addFuelEntry(payload: { veic: string; litros: number; valor: number; hodo: number; fornecedorId: number }): void {
    this.fuelEntries.update((list) => [
      { data: '20 jul', v: payload.veic, l: payload.litros, val: payload.valor, hod: payload.hodo, fornecedorId: payload.fornecedorId, kml: null, anom: false },
      ...list,
    ]);
    this.toast.show(`Abastecimento registrado — ${payload.veic}`);
  }

  addFornecedor(payload: { nome: string; endereco: string; cidade: string; telefone: string }): Fornecedor {
    const fornecedor: Fornecedor = {
      id: Date.now(),
      nome: payload.nome,
      endereco: payload.endereco,
      cidade: payload.cidade,
      telefone: payload.telefone || null,
    };
    this.fornecedores.update((list) => [...list, fornecedor]);
    this.toast.show(`Fornecedor cadastrado — ${fornecedor.nome}`);
    return fornecedor;
  }

  deleteFornecedor(id: number): void {
    const fornecedor = this.fornecedores().find((f) => f.id === id);
    if (!fornecedor) return;
    this.fornecedores.update((list) => list.filter((f) => f.id !== id));
    this.toast.show(`Fornecedor excluído — ${fornecedor.nome}`, 'info');
  }

  addDriver(payload: { nome: string; cat: string; val: string }): void {
    this.drivers.update((list) => [
      { nome: payload.nome, cat: payload.cat || 'B', val: payload.val || '—', dias: null, v: null, desde: null },
      ...list,
    ]);
    this.toast.show(`Motorista cadastrado — ${payload.nome}`);
  }

  addVehicle(payload: { placa: string; modelo: string; tipo: Vehicle['tipo'] }): void {
    const placa = payload.placa.toUpperCase();
    this.vehicles.update((list) => [
      ...list,
      { id: Date.now(), placa, modelo: payload.modelo || '—', tipo: payload.tipo, mot: null, hod: 0, comb: 100, kml: 0, troca: 10000, status: 'parado', pneus: ['ok', 'ok', 'ok', 'ok'], kmHoje: 0 },
    ]);
    this.toast.show(`Veículo adicionado à frota — ${placa}`);
  }

  completeMaintenance(id: string): void {
    const item = this.maintenanceItems().find((m) => m.id === id);
    if (!item) return;
    this.maintenanceItems.update((list) => list.filter((m) => m.id !== id));
    this.toast.show(`Manutenção marcada como feita — ${item.item} · ${item.v}`);
  }

  deleteVehicle(placa: string): void {
    this.vehicles.update((list) => list.filter((v) => v.placa !== placa));
    this.toast.show(`Veículo ${placa} excluído — histórico arquivado por 90 dias`, 'info');
  }

  async loadAccount(): Promise<void> {
    const empresa = await firstValueFrom(this.http.get<EmpresaApi>(`${environment.apiUrl}/empresa`));
    this.account.set(paraConta(empresa));
  }

  /** Retorna a mensagem de erro, ou null se salvou. */
  async updateAccount(payload: Partial<CompanyAccount>): Promise<string | null> {
    try {
      const empresa = await firstValueFrom(
        this.http.patch<EmpresaApi>(`${environment.apiUrl}/empresa`, paraEmpresaApi(payload)),
      );
      this.account.set(paraConta(empresa));
      this.toast.show('Alterações salvas — cadastro da conta atualizado');
      return null;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        const msg = err.error?.message;
        return Array.isArray(msg) && msg.some((m: string) => m.includes('contatoEmail'))
          ? 'E-mail inválido — confira o formato.'
          : 'Dados inválidos — confira os campos.';
      }
      if (err instanceof HttpErrorResponse && err.status === 409) {
        return 'Este CNPJ já está cadastrado em outra conta.';
      }
      return 'Não foi possível salvar. Tente novamente.';
    }
  }

  hapoloConnect(token: string): { error: string } | null {
    const t = token.trim();
    if (!t) return { error: 'Cole o token gerado no painel Hapolo — o campo está vazio.' };
    if (!t.startsWith('hap_')) return { error: 'Token não reconhecido — tokens Hapolo começam com "hap_live_" ou "hap_test_". Confira se copiou o valor inteiro.' };
    this.hapoloValidating.set(true);
    setTimeout(() => {
      this.hapoloValidating.set(false);
      this.hapoloStatus.set('conectado');
      this.toast.show('Token Hapolo conectado — telemetria sincronizando');
    }, 1400);
    return null;
  }

  hapoloTest(): void {
    this.toast.show('Conexão com a Hapolo OK — 8 veículos reportando, latência 320 ms', 'info');
  }

  hapoloRemove(): void {
    this.hapoloStatus.set('sem');
    this.toast.show('Token removido — a telemetria para de sincronizar até um novo token ser conectado', 'info');
  }

  retryLoad(): void {
    this.dataStateRaw.set('carregando');
    setTimeout(() => {
      this.dataStateRaw.set('normal');
      this.toast.show('Dados da frota recarregados');
    }, 1400);
  }
}
