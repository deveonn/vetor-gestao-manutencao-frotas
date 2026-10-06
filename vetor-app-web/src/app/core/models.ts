export type VehicleStatus = 'rodando' | 'manutencao' | 'parado';
export type VehicleType = 'Utilitário' | 'Van de carga' | 'Caminhão leve';
export type Severity = 'ok' | 'atencao' | 'critico';
export type AlertLevel = 'ok' | 'atencao' | 'critico' | 'info';

export interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  tipo: VehicleType;
  mot: string | null;
  hod: number;
  comb: number;
  kml: number;
  /** km até a próxima troca de óleo; negativo = vencida há |troca| km */
  troca: number;
  status: VehicleStatus;
  pneus: Severity[];
  kmHoje: number;
}

export interface Alert {
  nv: AlertLevel;
  t: string;
  /** null = alerta sem veículo (ex.: CNH de motorista) */
  v: string | null;
  acao: string;
}

export interface FuelEntry {
  id: string;
  /** data completa (ISO), pra filtros por período; `data` é o rótulo curto exibido */
  iso: string;
  data: string;
  v: string;
  l: number;
  val: number;
  hod: number;
  fornecedorId: string;
  kml: number | null;
  anom: boolean;
}

export interface Fornecedor {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  telefone: string | null;
}

export interface WeekPoint {
  lbl: string;
  /** null = semana sem leitura */
  val: number | null;
}

export interface MaintenanceItem {
  id: string;
  v: string;
  item: string;
  /** km até a meta (negativo = vencida); null = manutenção só por data */
  resta: number | null;
  /** dias até a data limite (negativo = vencida); null = manutenção só por km */
  dias: number | null;
  nv: AlertLevel;
  prazo: string;
}

export interface MaintenanceHistoryEntry {
  id: string;
  data: string;
  v: string;
  item: string;
  /** null = concluída sem informar custo/oficina */
  custo: number | null;
  ofi: string | null;
}

export interface MaintenancePlanItem {
  item: string;
  km: string;
  tempo: string;
}

export interface MaintenancePlan {
  tipo: VehicleType;
  itens: MaintenancePlanItem[];
}

export interface FlaggedTire {
  v: string;
  pos: string;
  obs: string;
  vist: string;
  nv: AlertLevel;
}

export interface InspectionItem {
  n: string;
  ok: boolean;
  /** pior avaliação entre os sub-itens da etapa */
  nv: Severity;
  obs: string;
}

export interface Inspection {
  id: string;
  v: string;
  data: string;
  mot: string;
  itens: InspectionItem[];
}

export interface Driver {
  id: string;
  nome: string;
  cat: string;
  val: string;
  dias: number | null;
  v: string | null;
  desde: string | null;
  /** usuário do app do motorista; null = ainda sem acesso ao app */
  login: string | null;
}

export interface ReportVehicleCost {
  placa: string;
  km: number;
  custo: number;
  /** R$/km; null quando não há km rodado no período */
  ckm: number | null;
}

/** Comparativo por categoria entre dois períodos (semana ou mês): anterior × atual. */
export interface ReportCategory {
  n: string;
  ant: number;
  atu: number;
}

export interface CompanyAccount {
  empresa: string;
  cnpj: string;
  nome: string;
  email: string;
  fone: string;
}

export type ReportId = 'comparativo' | 'veiculo' | 'consumo' | 'disponibilidade' | 'manutencao';
export type ReportScope = 'frota' | 'veiculo';
export type DataState = 'normal' | 'carregando' | 'vazio' | 'erro';
export type HapoloStatus = 'conectado' | 'sem';
