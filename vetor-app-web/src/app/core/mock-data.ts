import { Alert, ReportCategory, ReportVehicleCost } from './models';

export const MOCK_ALERTS: Alert[] = [
  { nv: 'critico', t: 'Troca de óleo vencida há 340 km', v: 'SQP-7D45', acao: 'manutencao' },
  { nv: 'critico', t: 'Pneu traseiro esquerdo sinalizado na vistoria de 18 jul', v: 'SQP-7D45', acao: 'pneus' },
  { nv: 'atencao', t: 'Consumo anômalo: 6,4 km/L contra média de 8,3', v: 'RKM-2E88', acao: 'combustivel' },
  { nv: 'atencao', t: 'CNH de Marcos Teixeira vence em 12 dias', v: 'TQJ-1F77', acao: 'motoristas' },
  { nv: 'atencao', t: 'Troca de óleo em 850 km', v: 'RKM-2E88', acao: 'manutencao' },
  { nv: 'info', t: 'Vistoria recebida do app — sem apontamentos', v: 'RYD-5H36', acao: 'pneus' },
];

export const MOCK_CUSTO_SEMANAL: number[] = [15980, 15420, 16210, 15760, 14980, 16480, 15120, 15890];

export const MOCK_REPORT_COSTS: ReportVehicleCost[] = [
  { placa: 'RTX-4B21', km: 4410, custo: 4980 }, { placa: 'SQP-7D45', km: 3980, custo: 6120 },
  { placa: 'TAV-9C10', km: 3260, custo: 3140 }, { placa: 'RKM-2E88', km: 4720, custo: 6890 },
  { placa: 'SBF-6A03', km: 2110, custo: 4310 }, { placa: 'TQJ-1F77', km: 4080, custo: 4450 },
  { placa: 'RYD-5H36', km: 5140, custo: 6480 }, { placa: 'SNC-8G54', km: 940, custo: 820 },
];

export const MOCK_REPORT_CATEGORIES: ReportCategory[] = [
  { n: 'Combustível', jun: 41200, jul: 31900 },
  { n: 'Manutenção', jun: 11300, jul: 9800 },
  { n: 'Pneus', jun: 6440, jul: 5610 },
];

export const MOCK_WEEK_CATEGORIES = [
  { n: 'Combustível', atu: 12940, ant: 11870 },
  { n: 'Manutenção', atu: 3610, ant: 2230 },
  { n: 'Pneus', atu: 1912, ant: 1790 },
];

