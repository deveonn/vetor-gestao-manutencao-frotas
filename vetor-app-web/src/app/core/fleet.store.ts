import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { dataCurta, dec, diaMes, diaMesHora, diaMesUtc, fmt, mesAno, money } from './format';
import { Alert, AlertLevel, CompanyAccount, DataState, Driver, FlaggedTire, Inspection, InspectionItem, Fornecedor, FuelEntry, HapoloStatus, MaintenanceHistoryEntry, MaintenanceItem, MaintenancePlan, ReportCategory, ReportVehicleCost, Severity, Vehicle, VehicleType, WeekPoint } from './models';
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

/** Integração como vem de GET /integracoes/rastreamento. */
interface IntegracaoApi {
  status: 'CONECTADO' | 'SEM';
  tokenCauda: string | null;
  conectadoEm: string | null;
}

/** Veículo como vem de GET/POST /veiculos (nomes do schema Prisma). */
interface VeiculoApi {
  id: string;
  placa: string;
  modelo: string;
  tipo: 'UTILITARIO' | 'VAN_CARGA' | 'CAMINHAO_LEVE';
  status: 'RODANDO' | 'MANUTENCAO' | 'PARADO';
  hodometro: number;
  nivelCombustivel: number;
  kmL: number | null;
  kmParaTroca: number;
  kmHoje: number;
  motoristaAtual: { nome: string } | null;
  pneus: { posicao: string; severidade: 'OK' | 'ATENCAO' | 'CRITICO' }[];
}

/** Motorista como vem de GET/POST /motoristas (POST não traz veiculoAtual/vinculos). */
interface MotoristaApi {
  id: string;
  nome: string;
  categoriaCnh: string;
  validadeCnh: string | null;
  veiculoAtual?: { id: string; placa: string }[];
  vinculos?: { veiculoId: string; de: string }[];
  /** acesso ao app (só o login — a API nunca devolve a senha) */
  usuario?: { usuario: string | null } | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function paraMotorista(m: MotoristaApi): Driver {
  const veiculo = m.veiculoAtual?.[0] ?? null;
  const vinculo = veiculo ? m.vinculos?.find((h) => h.veiculoId === veiculo.id) : undefined;
  const validade = m.validadeCnh ? new Date(m.validadeCnh) : null;
  return {
    id: m.id,
    nome: m.nome,
    cat: m.categoriaCnh,
    // validade é só data (meia-noite UTC) — lê em UTC pra não voltar um dia no fuso do Brasil
    val: validade ? `${String(validade.getUTCMonth() + 1).padStart(2, '0')}/${validade.getUTCFullYear()}` : '—',
    dias: validade ? Math.ceil((validade.getTime() - Date.now()) / DIA_MS) : null,
    v: veiculo?.placa ?? null,
    desde: vinculo ? mesAno(vinculo.de) : null,
    login: m.usuario?.usuario ?? null,
  };
}

/** Erro do cadastro/acesso do motorista: as regras de usuário e senha a API já explica em português. */
function erroAcesso(err: unknown, padrao: string): string {
  if (err instanceof HttpErrorResponse && err.status === 409) return 'Esse usuário já está em uso — escolha outro.';
  if (err instanceof HttpErrorResponse && err.status === 400) {
    const msgs = ([] as string[]).concat(err.error?.message ?? []);
    const doAcesso = msgs.filter((m) => /usu[aá]rio|senha/i.test(m));
    return doAcesso.length ? doAcesso.join(' ') : 'Dados inválidos — confira o nome e a validade da CNH.';
  }
  return padrao;
}

/** Abastecimento como vem de GET/POST /abastecimentos. kmL/anomalo são calculados no backend. */
interface AbastecimentoApi {
  id: string;
  data: string;
  litros: number;
  valor: number;
  hodometro: number;
  kmL: number | null;
  anomalo: boolean;
  fornecedorId: string;
  veiculo: { placa: string };
}

interface FornecedorApi {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  telefone: string | null;
}

function paraAbastecimento(a: AbastecimentoApi): FuelEntry {
  return {
    id: a.id, iso: a.data, data: diaMes(a.data), v: a.veiculo.placa, l: a.litros, val: a.valor,
    hod: a.hodometro, fornecedorId: a.fornecedorId, kml: a.kmL, anom: a.anomalo,
  };
}

function paraFornecedor(f: FornecedorApi): Fornecedor {
  return { id: f.id, nome: f.nome, endereco: f.endereco ?? '', cidade: f.cidade ?? '', telefone: f.telefone };
}

/** Manutenção como vem de /manutencoes/pendentes, /historico e /:id/concluir. */
interface ManutencaoApi {
  id: string;
  item: string;
  kmRestante: number | null;
  nivel: 'OK' | 'ATENCAO' | 'CRITICO' | null;
  prazo: string | null;
  custo: number | null;
  oficina: string | null;
  concluidoEm: string | null;
  veiculo: { placa: string };
}

interface PlanoApi {
  tipoVeiculo: VeiculoApi['tipo'];
  itens: { item: string; km: string; tempo: string }[];
}

function paraPendente(m: ManutencaoApi): MaintenanceItem {
  return {
    id: m.id, v: m.veiculo.placa, item: m.item, resta: m.kmRestante ?? 0,
    nv: (m.nivel?.toLowerCase() ?? 'ok') as MaintenanceItem['nv'], prazo: m.prazo ?? '—',
  };
}

function paraHistorico(m: ManutencaoApi): MaintenanceHistoryEntry {
  return {
    id: m.id, data: m.concluidoEm ? diaMes(m.concluidoEm) : '—', v: m.veiculo.placa, item: m.item,
    custo: m.custo, ofi: m.oficina,
  };
}

/** GET /pneus/sinalizados — estado atual por posição + vistoria mais recente daquela posição. */
interface PneuSinalizadoApi {
  veiculo: { placa: string };
  posicao: string;
  severidade: 'ATENCAO' | 'CRITICO';
  observacao: string | null;
  vistoriaEm: string | null;
}

/** GET /vistorias — itens vêm por sub-item (ex.: um por pneu); a tela agrupa por etapa do checklist. */
interface VistoriaApi {
  id: string;
  iniciadoEm: string;
  veiculo: { placa: string };
  motorista: { nome: string };
  itens: { stepId: string; label: string; avaliacao: 'OK' | 'ATENCAO' | 'TROCAR'; observacao: string | null }[];
}

/** Etapas do checklist do app (CHECKLIST_CONFIG em vetor-app-mobile/.../inspection.model.ts), na ordem do app. */
const ETAPAS_VISTORIA: Record<string, string> = {
  pneus: 'Pneus', 'oleo-agua': 'Óleo e água', 'luzes-setas': 'Luzes e setas', freios: 'Freios', lataria: 'Lataria',
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function paraPneuSinalizado(p: PneuSinalizadoApi): FlaggedTire {
  return {
    v: p.veiculo.placa, pos: capitalizar(p.posicao), obs: p.observacao ?? '—',
    vist: p.vistoriaEm ? diaMes(p.vistoriaEm) : '—', nv: p.severidade === 'CRITICO' ? 'critico' : 'atencao',
  };
}

function paraVistoria(vi: VistoriaApi): Inspection {
  const ordem = Object.keys(ETAPAS_VISTORIA);
  const etapas = [...new Set(vi.itens.map((i) => i.stepId))]
    .sort((a, b) => (ordem.indexOf(a) + 1 || 99) - (ordem.indexOf(b) + 1 || 99));
  const itens: InspectionItem[] = etapas.map((stepId) => {
    const sub = vi.itens.filter((i) => i.stepId === stepId);
    const nv: Severity = sub.some((i) => i.avaliacao === 'TROCAR') ? 'critico' : sub.some((i) => i.avaliacao === 'ATENCAO') ? 'atencao' : 'ok';
    const obs = sub.filter((i) => i.avaliacao !== 'OK').map((i) => i.observacao || i.label).join('; ');
    return { n: ETAPAS_VISTORIA[stepId] ?? stepId, ok: nv === 'ok', nv, obs };
  });
  return { id: vi.id, v: vi.veiculo.placa, data: diaMesHora(vi.iniciadoEm), mot: vi.motorista.nome, itens };
}

interface AlertaApi {
  nivel: AlertLevel;
  titulo: string;
  veiculo: string | null;
  acao: string;
}

interface CategoriaApi {
  categoria: string;
  atual: number;
  anterior: number;
}

interface CustoVeiculoApi {
  placa: string;
  km: number;
  custo: number;
  custoPorKm: number | null;
}

const paraCategoria = (c: CategoriaApi): ReportCategory => ({ n: c.categoria, ant: c.anterior, atu: c.atual });

/** "AAAA-MM" do mês que contém `d`. */
const mesIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

interface VinculoApi {
  de: string;
  ate: string | null;
  motorista: { nome: string };
}

const TIPO_API: Record<VeiculoApi['tipo'], VehicleType> = {
  UTILITARIO: 'Utilitário', VAN_CARGA: 'Van de carga', CAMINHAO_LEVE: 'Caminhão leve',
};
const TIPO_API_INV = Object.fromEntries(Object.entries(TIPO_API).map(([k, v]) => [v, k])) as Record<VehicleType, VeiculoApi['tipo']>;
/** Ordem das posições no diagrama de pneus (mesma de TIRE_POS_NAME). */
const POSICOES_PNEU = ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo', 'traseiro direito'];

function paraVeiculo(v: VeiculoApi): Vehicle {
  return {
    id: v.id,
    placa: v.placa,
    modelo: v.modelo,
    tipo: TIPO_API[v.tipo],
    mot: v.motoristaAtual?.nome ?? null,
    hod: v.hodometro,
    comb: v.nivelCombustivel,
    kml: v.kmL ?? 0,
    troca: v.kmParaTroca,
    status: v.status.toLowerCase() as Vehicle['status'],
    // caminhão leve tem traseiro duplo ("traseiro esquerdo interno/externo"): o diagrama de 4 posições mostra a
    // pior severidade entre as rodas daquele lado
    pneus: POSICOES_PNEU.map((pos) => {
      const sevs = v.pneus.filter((p) => p.posicao === pos || p.posicao.startsWith(`${pos} `)).map((p) => p.severidade);
      return (sevs.includes('CRITICO') ? 'critico' : sevs.includes('ATENCAO') ? 'atencao' : 'ok') as Severity;
    }),
    kmHoje: v.kmHoje,
  };
}

const CONTA_VAZIA: CompanyAccount = { empresa: '', cnpj: '', nome: '', email: '', fone: '' };

function severityColor(s: Severity | AlertLevel): string {
  return SEVERITY_COLOR[s as AlertLevel] ?? SEVERITY_COLOR.ok;
}

@Injectable({ providedIn: 'root' })
export class FleetStore {
  // --- dados brutos ---
  /** Vem da API (GET /veiculos) — carregada pelo shell; dataState acompanha o carregamento. */
  readonly vehicles = signal<Vehicle[]>([]);
  /** Dashboard e relatórios vêm da API (GET /dashboard/*, /relatorios/*) — ver loadDashboard/loadReports. */
  readonly alerts = signal<Alert[]>([]);
  /** Vêm da API (GET /abastecimentos, /abastecimentos/km-l-semanal, /fornecedores) — carregados pelo shell. */
  readonly fuelEntries = signal<FuelEntry[]>([]);
  readonly kmlWeekly = signal<WeekPoint[]>([]);
  readonly custoWeekly = signal<number[]>([]);
  /** km/L médio da frota (média do km/L atual dos veículos ativos), de GET /dashboard/resumo. */
  readonly kmlMedioFrota = signal(0);
  /** Custo por categoria: últimos 7 dias × 7 dias anteriores. */
  readonly weekCategories = signal<ReportCategory[]>([]);
  /** Custo por categoria: mês anterior × mês atual (até hoje). */
  readonly reportCategories = signal<ReportCategory[]>([]);
  /** Vêm da API (GET /manutencoes/pendentes, /historico, /planos) — carregados pelo shell. */
  readonly maintenanceItems = signal<MaintenanceItem[]>([]);
  readonly maintenanceHistory = signal<MaintenanceHistoryEntry[]>([]);
  readonly plans = signal<MaintenancePlan[]>([]);
  /** Vêm da API (GET /pneus/sinalizados, /vistorias) — carregados pelo shell. Escritos só pelo app mobile. */
  readonly flaggedTires = signal<FlaggedTire[]>([]);
  readonly inspections = signal<Inspection[]>([]);
  /** Vem da API (GET /motoristas) — carregada pelo shell. */
  readonly drivers = signal<Driver[]>([]);
  readonly fornecedores = signal<Fornecedor[]>([]);
  /** Custo por veículo nos últimos 30 dias. */
  readonly reportCosts = signal<ReportVehicleCost[]>([]);
  /** Vem da API (GET /empresa) — carregada pelo shell ao entrar no painel. */
  readonly account = signal<CompanyAccount>(CONTA_VAZIA);
  /** null até GET /integracoes/rastreamento responder (carregada pelo shell, junto com a conta). */
  readonly hapoloStatus = signal<HapoloStatus | null>(null);
  readonly hapoloValidating = signal(false);
  readonly hapoloTokenTail = signal('');
  readonly hapoloConectadoEm = signal('');

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

  constructor(private toast: ToastService) {}

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
    const cats = this.weekCategories();
    const custo = cats.reduce((sum, c) => sum + c.atu, 0);
    const custoAnterior = cats.reduce((sum, c) => sum + c.ant, 0);
    const { manutencao, total } = this.dispCounts();
    return {
      custo,
      custoAnterior,
      kmlMedia: this.kmlMedioFrota(),
      disponiveis: total - manutencao,
      totalVeiculos: total,
      alertasCount: this.alerts().length,
    };
  });

  readonly categoriesWithDelta = computed(() => {
    const cats = this.weekCategories();
    const escala = Math.max(1, ...cats.flatMap((c) => [c.atu, c.ant]));
    return cats.map((c) => {
      // sem gasto na semana anterior não há base pra percentual
      const d = c.ant > 0 ? Math.round((c.atu / c.ant - 1) * 100) : null;
      return {
        ...c,
        atuF: money(c.atu),
        antF: money(c.ant),
        pctAtu: Math.round((c.atu / escala) * 100),
        pctAnt: Math.round((c.ant / escala) * 100),
        delta: d == null ? '—' : (d >= 0 ? '+' : '') + d + '%',
        dCor: d == null ? 'var(--dim)' : d > 25 ? 'var(--crit)' : d > 8 ? 'var(--warn)' : 'var(--mut)',
      };
    });
  });

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
      kmlF: r.kml == null ? '—' : dec(r.kml.toFixed(1)),
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
    valF: x.val == null ? '—' : dec(x.val.toFixed(1)),
    hPct: x.val == null ? 0 : Math.round((x.val / 13) * 100),
    cor: x.val == null ? 'var(--dim)' : x.val < 7.6 ? 'var(--warn)' : 'var(--brand)',
  })));

  readonly maintenanceEnriched = computed(() => this.maintenanceItems().map((m) => ({
    ...m,
    cor: SEVERITY_COLOR[m.nv],
    glifo: SEVERITY_GLYPH[m.nv],
    pct: clamp(4, 100, Math.round(100 - (m.resta / 10000) * 100)),
  })));

  readonly maintenanceHistoryEnriched = computed(() => this.maintenanceHistory().map((h) => ({
    ...h,
    custoF: h.custo == null ? '—' : money(h.custo),
    ofiTxt: h.ofi || '—',
  })));

  /** Rótulo do plano com os modelos da frota daquele tipo, ex.: "Utilitário — Fiorino, Saveiro". */
  readonly plansEnriched = computed(() => {
    const vehicles = this.vehicles();
    return this.plans().map((p) => {
      const modelos = [...new Set(vehicles.filter((v) => v.tipo === p.tipo && v.modelo !== '—')
        // sem a marca: "Mercedes Sprinter 415" -> "Sprinter 415"
        .map((v) => v.modelo.split(' ').slice(1).join(' ') || v.modelo))];
      return { ...p, titulo: modelos.length ? `${p.tipo} — ${modelos.join(', ')}` : p.tipo };
    });
  });

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
      glifo: it.nv === 'ok' ? 'check_circle' : it.nv === 'atencao' ? 'warning' : 'error',
      cor: SEVERITY_COLOR[it.nv],
      lbl: it.ok ? 'ok' : it.obs,
    })),
  })));

  readonly driversEnriched = computed(() => this.drivers().map((m) => ({
    ...m,
    vTxt: m.v || 'sem vínculo',
    desdeTxt: m.desde ? `desde ${m.desde}` : '—',
    cnhCor: m.dias == null ? 'var(--dim)' : m.dias < 0 ? 'var(--crit)' : m.dias <= 30 ? 'var(--warn)' : 'var(--ok)',
    cnhTxt: m.dias == null ? 'sem validade' : m.dias < 0 ? 'vencida' : m.dias <= 30 ? `vence em ${m.dias} dias` : 'em dia',
    cnhBg: m.dias == null ? 'var(--surf2)' : m.dias < 0 ? 'var(--crit-bg)' : m.dias <= 30 ? 'var(--warn-bg)' : 'var(--ok-bg)',
  })));

  readonly reportCostsEnriched = computed(() => this.reportCosts().map((r) => ({
    ...r,
    kmF: fmt(r.km),
    custoF: money(r.custo),
    ckmF: r.ckm == null ? '—' : 'R$ ' + dec(r.ckm.toFixed(2)),
  })));

  readonly reportCategoriesEnriched = computed(() => {
    const cats = this.reportCategories();
    const escala = Math.max(1, ...cats.flatMap((c) => [c.atu, c.ant]));
    return cats.map((c) => ({
      ...c,
      antF: money(c.ant),
      atuF: money(c.atu),
      pctAnt: Math.round((c.ant / escala) * 100),
      pctAtu: Math.round((c.atu / escala) * 100),
    }));
  });

  findVehicleByPlaca(placa: string) {
    return this.vehiclesEnriched().find((v) => v.placa === placa) ?? null;
  }

  // --- mutações ---
  async loadFuel(): Promise<void> {
    const [abastecimentos, fornecedores] = await Promise.all([
      firstValueFrom(this.http.get<AbastecimentoApi[]>(`${environment.apiUrl}/abastecimentos`)),
      firstValueFrom(this.http.get<FornecedorApi[]>(`${environment.apiUrl}/fornecedores`)),
      this.loadKmlWeekly(),
    ]);
    this.fuelEntries.set(abastecimentos.map(paraAbastecimento));
    this.fornecedores.set(fornecedores.map(paraFornecedor));
  }

  private async loadKmlWeekly(): Promise<void> {
    const serie = await firstValueFrom(
      this.http.get<{ semana: string; kmLMedio: number | null }[]>(`${environment.apiUrl}/abastecimentos/km-l-semanal?semanas=8`),
    );
    this.kmlWeekly.set(serie.map((s) => ({ lbl: diaMesUtc(s.semana), val: s.kmLMedio })));
  }

  /**
   * `data` é a data do input (yyyy-mm-dd) ou vazio (= agora). O km/L e a flag de anomalia vêm calculados do backend.
   * Retorna a mensagem de erro, ou null se registrou.
   */
  async addFuelEntry(payload: { veic: string; data: string; litros: number; valor: number; hodo: number; fornecedorId: string }): Promise<string | null> {
    const veiculo = this.vehicles().find((v) => v.placa === payload.veic);
    if (!veiculo) return 'Selecione o veículo.';
    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    // data passada vai ao meio-dia local (não vira o dia anterior em UTC); hoje/vazio = agora, pra ficar depois dos de hoje
    const data = payload.data && payload.data !== hojeIso ? new Date(`${payload.data}T12:00:00`).toISOString() : undefined;
    try {
      const criado = await firstValueFrom(this.http.post<AbastecimentoApi>(`${environment.apiUrl}/abastecimentos`, {
        veiculoId: veiculo.id, fornecedorId: payload.fornecedorId, litros: payload.litros, valor: payload.valor,
        hodometro: payload.hodo, ...(data ? { data } : {}),
      }));
      const novo = paraAbastecimento(criado);
      this.fuelEntries.update((list) => [...list, novo].sort((a, b) => b.iso.localeCompare(a.iso)));
      // backend atualiza hodômetro/km-L do veículo e a série semanal — recarrega sem piscar o estado de carregamento
      this.loadVehicles(true);
      this.loadKmlWeekly().catch(() => {});
      this.refreshDashboard();
      const kml = novo.kml == null ? 'km/L não calculado (sem abastecimento anterior)' : `${dec(novo.kml)} km/L`;
      this.toast.show(`Abastecimento registrado — ${payload.veic} · ${kml}${novo.anom ? ' · consumo anômalo' : ''}`, novo.anom ? 'info' : 'ok');
      return null;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        return 'Dados inválidos — confira litros, valor e hodômetro.';
      }
      return 'Não foi possível registrar o abastecimento. Tente novamente.';
    }
  }

  /** Retorna a mensagem de erro, ou null se cadastrou. */
  async addFornecedor(payload: { nome: string; endereco: string; cidade: string; telefone: string }): Promise<string | null> {
    const body = {
      nome: payload.nome.trim(),
      ...(payload.endereco.trim() ? { endereco: payload.endereco.trim() } : {}),
      ...(payload.cidade.trim() ? { cidade: payload.cidade.trim() } : {}),
      ...(payload.telefone.trim() ? { telefone: payload.telefone.trim() } : {}),
    };
    try {
      const criado = await firstValueFrom(this.http.post<FornecedorApi>(`${environment.apiUrl}/fornecedores`, body));
      this.fornecedores.update((list) => [...list, paraFornecedor(criado)].sort((a, b) => a.nome.localeCompare(b.nome)));
      this.toast.show(`Fornecedor cadastrado — ${body.nome}`);
      return null;
    } catch {
      return 'Não foi possível cadastrar o fornecedor. Tente novamente.';
    }
  }

  async deleteFornecedor(id: string): Promise<void> {
    const fornecedor = this.fornecedores().find((f) => f.id === id);
    if (!fornecedor) return;
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/fornecedores/${id}`));
      this.fornecedores.update((list) => list.filter((f) => f.id !== id));
      this.toast.show(`Fornecedor excluído — ${fornecedor.nome}`, 'info');
    } catch (err) {
      const msg = err instanceof HttpErrorResponse && err.status === 409
        ? `${fornecedor.nome} tem abastecimentos registrados e não pode ser excluído`
        : `Não foi possível excluir ${fornecedor.nome}. Tente novamente.`;
      this.toast.show(msg, 'info');
    }
  }

  async loadDrivers(): Promise<void> {
    const lista = await firstValueFrom(this.http.get<MotoristaApi[]>(`${environment.apiUrl}/motoristas`));
    this.drivers.set(lista.map(paraMotorista));
  }

  /**
   * `val` é a data do input (yyyy-mm-dd) ou vazio; `usuario`/`senha` criam o acesso ao app junto.
   * Retorna a mensagem de erro, ou null se cadastrou.
   */
  async addDriver(payload: { nome: string; cat: string; val: string; usuario: string; senha: string }): Promise<string | null> {
    const nome = payload.nome.trim();
    try {
      const criado = await firstValueFrom(this.http.post<MotoristaApi>(`${environment.apiUrl}/motoristas`, {
        nome, categoriaCnh: payload.cat || 'B', ...(payload.val ? { validadeCnh: payload.val } : {}),
        usuario: payload.usuario.trim(), senha: payload.senha,
      }));
      this.drivers.update((list) => [...list, paraMotorista(criado)].sort((a, b) => a.nome.localeCompare(b.nome)));
      this.toast.show(`Motorista cadastrado — ${nome}`);
      this.refreshDashboard();
      return null;
    } catch (err) {
      return erroAcesso(err, 'Não foi possível cadastrar o motorista. Tente novamente.');
    }
  }

  /**
   * Cria o acesso ao app (motorista sem login — `usuario` obrigatório) ou redefine a senha. Redefinir encerra a
   * sessão do celular dele. Retorna a mensagem de erro, ou null se salvou.
   */
  async setDriverAccess(id: string, usuario: string | null, senha: string): Promise<string | null> {
    const tinhaAcesso = !!this.drivers().find((m) => m.id === id)?.login;
    try {
      const atualizado = await firstValueFrom(this.http.put<MotoristaApi>(`${environment.apiUrl}/motoristas/${id}/acesso`, {
        ...(usuario ? { usuario: usuario.trim() } : {}), senha,
      }));
      this.drivers.update((list) => list.map((m) => (m.id === id ? { ...m, login: atualizado.usuario?.usuario ?? null } : m)));
      this.toast.show(tinhaAcesso ? `Senha redefinida — ${atualizado.nome}` : `Acesso ao app criado — ${atualizado.nome}`);
      return null;
    } catch (err) {
      return erroAcesso(err, 'Não foi possível salvar o acesso. Tente novamente.');
    }
  }

  /** `silencioso`: recarrega sem passar por 'carregando' (ex.: depois de um abastecimento mudar o hodômetro). */
  async loadVehicles(silencioso = false): Promise<void> {
    if (!silencioso) this.dataStateRaw.set('carregando');
    try {
      const lista = await firstValueFrom(this.http.get<VeiculoApi[]>(`${environment.apiUrl}/veiculos`));
      this.vehicles.set(lista.map(paraVeiculo));
      this.dataStateRaw.set('normal');
    } catch {
      if (!silencioso) this.dataStateRaw.set('erro');
    }
  }

  /** Retorna a mensagem de erro, ou null se criou. */
  async addVehicle(payload: { placa: string; modelo: string; tipo: Vehicle['tipo'] }): Promise<string | null> {
    const placa = payload.placa.trim().toUpperCase();
    try {
      const criado = await firstValueFrom(this.http.post<VeiculoApi>(`${environment.apiUrl}/veiculos`, {
        placa, tipo: TIPO_API_INV[payload.tipo], ...(payload.modelo.trim() ? { modelo: payload.modelo.trim() } : {}),
      }));
      this.vehicles.update((list) => [...list, paraVeiculo(criado)].sort((a, b) => a.placa.localeCompare(b.placa)));
      this.toast.show(`Veículo adicionado à frota — ${placa}`);
      this.refreshDashboard();
      return null;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        return `A placa ${placa} já está cadastrada (ativa ou arquivada nos últimos 90 dias).`;
      }
      if (err instanceof HttpErrorResponse && err.status === 400) {
        return 'Dados inválidos — confira a placa e o tipo.';
      }
      return 'Não foi possível adicionar o veículo. Tente novamente.';
    }
  }

  /** Recarregado pelo shell e a cada visita ao painel; mutações que mudam custo/alertas chamam de novo. */
  async loadDashboard(): Promise<void> {
    const [alertas, resumo, custo, categorias] = await Promise.all([
      firstValueFrom(this.http.get<AlertaApi[]>(`${environment.apiUrl}/dashboard/alertas`)),
      firstValueFrom(this.http.get<{ kmLMedio: number }>(`${environment.apiUrl}/dashboard/resumo`)),
      firstValueFrom(this.http.get<{ total: number }[]>(`${environment.apiUrl}/dashboard/custo-semanal?semanas=8`)),
      firstValueFrom(this.http.get<CategoriaApi[]>(`${environment.apiUrl}/relatorios/categorias-semana`)),
    ]);
    this.alerts.set(alertas.map((a) => ({ nv: a.nivel, t: a.titulo, v: a.veiculo, acao: a.acao })));
    this.kmlMedioFrota.set(resumo.kmLMedio);
    this.custoWeekly.set(custo.map((c) => c.total));
    this.weekCategories.set(categorias.map(paraCategoria));
  }

  /** Relatórios: custo por veículo (últimos 30 dias) e comparativo mês anterior × mês atual. */
  async loadReports(): Promise<void> {
    const hoje = new Date();
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const [custos, categorias] = await Promise.all([
      firstValueFrom(this.http.get<CustoVeiculoApi[]>(`${environment.apiUrl}/relatorios/custo-por-veiculo`)),
      firstValueFrom(this.http.get<CategoriaApi[]>(
        `${environment.apiUrl}/relatorios/categorias-mensal?mesA=${mesIso(mesAnterior)}&mesB=${mesIso(hoje)}`,
      )),
    ]);
    this.reportCosts.set(custos.map((c) => ({ placa: c.placa, km: c.km, custo: c.custo, ckm: c.custoPorKm })));
    this.reportCategories.set(categorias.map(paraCategoria));
  }

  /** Depois de uma mutação que muda custo/alertas/frota — atualiza painel sem bloquear. */
  private refreshDashboard(): void {
    this.loadDashboard().catch(() => {});
  }

  async loadTiresAndInspections(): Promise<void> {
    const [pneus, vistorias] = await Promise.all([
      firstValueFrom(this.http.get<PneuSinalizadoApi[]>(`${environment.apiUrl}/pneus/sinalizados`)),
      firstValueFrom(this.http.get<VistoriaApi[]>(`${environment.apiUrl}/vistorias`)),
    ]);
    this.flaggedTires.set(pneus.map(paraPneuSinalizado));
    this.inspections.set(vistorias.map(paraVistoria));
  }

  async loadMaintenance(): Promise<void> {
    const [pendentes, historico, planos] = await Promise.all([
      firstValueFrom(this.http.get<ManutencaoApi[]>(`${environment.apiUrl}/manutencoes/pendentes`)),
      firstValueFrom(this.http.get<ManutencaoApi[]>(`${environment.apiUrl}/manutencoes/historico`)),
      firstValueFrom(this.http.get<PlanoApi[]>(`${environment.apiUrl}/manutencoes/planos`)),
    ]);
    this.maintenanceItems.set(pendentes.map(paraPendente));
    this.maintenanceHistory.set(historico.map(paraHistorico));
    this.plans.set(planos.map((p) => ({ tipo: TIPO_API[p.tipoVeiculo], itens: p.itens })));
  }

  async completeMaintenance(id: string): Promise<void> {
    const item = this.maintenanceItems().find((m) => m.id === id);
    if (!item) return;
    try {
      const concluida = await firstValueFrom(this.http.post<ManutencaoApi>(`${environment.apiUrl}/manutencoes/${id}/concluir`, {}));
      this.maintenanceItems.update((list) => list.filter((m) => m.id !== id));
      this.maintenanceHistory.update((list) => [paraHistorico(concluida), ...list]);
      this.toast.show(`Manutenção marcada como feita — ${item.item} · ${item.v}`);
      this.refreshDashboard();
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        // já concluída em outra aba/sessão — sincroniza com o servidor
        this.maintenanceItems.update((list) => list.filter((m) => m.id !== id));
        this.toast.show(`Esta manutenção já tinha sido concluída — ${item.item} · ${item.v}`, 'info');
        return;
      }
      this.toast.show(`Não foi possível concluir a manutenção — ${item.item} · ${item.v}`, 'info');
    }
  }

  /** Retorna true se excluiu (arquivou) na API. */
  async deleteVehicle(placa: string): Promise<boolean> {
    const veiculo = this.vehicles().find((v) => v.placa === placa);
    if (!veiculo) return false;
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/veiculos/${veiculo.id}`));
      this.vehicles.update((list) => list.filter((v) => v.id !== veiculo.id));
      this.toast.show(`Veículo ${placa} excluído — histórico arquivado por 90 dias`, 'info');
      this.refreshDashboard();
      return true;
    } catch {
      this.toast.show(`Não foi possível excluir o veículo ${placa}. Tente novamente.`, 'info');
      return false;
    }
  }

  /** Histórico motorista↔veículo (GET /veiculos/:id/vinculos), mais recente primeiro. */
  async loadVinculos(veiculoId: string): Promise<{ mot: string; de: string; ate: string }[]> {
    const lista = await firstValueFrom(this.http.get<VinculoApi[]>(`${environment.apiUrl}/veiculos/${veiculoId}/vinculos`));
    return lista.map((h) => ({ mot: h.motorista.nome, de: mesAno(h.de), ate: h.ate ? mesAno(h.ate) : 'atual' }));
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

  async loadHapolo(): Promise<void> {
    this.aplicarIntegracao(await firstValueFrom(this.http.get<IntegracaoApi>(`${environment.apiUrl}/integracoes/rastreamento`)));
  }

  async hapoloConnect(token: string): Promise<{ error: string } | null> {
    const t = token.trim();
    if (!t) return { error: 'Cole o token gerado no painel Hapolo — o campo está vazio.' };
    if (!t.startsWith('hap_')) return { error: 'Token não reconhecido — tokens Hapolo começam com "hap_live_" ou "hap_test_". Confira se copiou o valor inteiro.' };
    this.hapoloValidating.set(true);
    try {
      this.aplicarIntegracao(
        await firstValueFrom(this.http.post<IntegracaoApi>(`${environment.apiUrl}/integracoes/rastreamento/conectar`, { token: t })),
      );
      this.toast.show('Token Hapolo conectado — telemetria sincronizando');
      return null;
    } catch {
      return { error: 'Não foi possível conectar o token. Tente novamente.' };
    } finally {
      this.hapoloValidating.set(false);
    }
  }

  async hapoloTest(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; mensagem: string }>(`${environment.apiUrl}/integracoes/rastreamento/testar`, {}),
      );
      this.toast.show(res.ok ? 'Conexão com a Hapolo OK' : `Teste falhou — ${res.mensagem}`, res.ok ? 'ok' : 'info');
    } catch {
      this.toast.show('Não foi possível testar a conexão agora', 'info');
    }
  }

  async hapoloRemove(): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/integracoes/rastreamento`));
      this.aplicarIntegracao({ status: 'SEM', tokenCauda: null, conectadoEm: null });
      this.toast.show('Token removido — a telemetria para de sincronizar até um novo token ser conectado', 'info');
    } catch {
      this.toast.show('Não foi possível remover o token agora', 'info');
    }
  }

  private aplicarIntegracao(i: IntegracaoApi): void {
    this.hapoloStatus.set(i.status === 'CONECTADO' ? 'conectado' : 'sem');
    this.hapoloTokenTail.set(i.tokenCauda ?? '');
    this.hapoloConectadoEm.set(i.conectadoEm ? dataCurta(i.conectadoEm) : '');
  }

  async retryLoad(): Promise<void> {
    await this.loadVehicles();
    if (this.dataStateRaw() === 'normal') this.toast.show('Dados da frota recarregados');
  }
}
