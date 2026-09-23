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
  v: string;
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
  resta: number;
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
  obs: string;
}

export interface Inspection {
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
}

export interface ReportVehicleCost {
  placa: string;
  km: number;
  custo: number;
}

export interface ReportCategory {
  n: string;
  jun: number;
  jul: number;
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
