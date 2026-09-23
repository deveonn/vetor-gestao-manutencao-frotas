import { Alert, FlaggedTire, Inspection, ReportCategory, ReportVehicleCost } from './models';

export const MOCK_ALERTS: Alert[] = [
  { nv: 'critico', t: 'Troca de óleo vencida há 340 km', v: 'SQP-7D45', acao: 'manutencao' },
  { nv: 'critico', t: 'Pneu traseiro esquerdo sinalizado na vistoria de 18 jul', v: 'SQP-7D45', acao: 'pneus' },
  { nv: 'atencao', t: 'Consumo anômalo: 6,4 km/L contra média de 8,3', v: 'RKM-2E88', acao: 'combustivel' },
  { nv: 'atencao', t: 'CNH de Marcos Teixeira vence em 12 dias', v: 'TQJ-1F77', acao: 'motoristas' },
  { nv: 'atencao', t: 'Troca de óleo em 850 km', v: 'RKM-2E88', acao: 'manutencao' },
  { nv: 'info', t: 'Vistoria recebida do app — sem apontamentos', v: 'RYD-5H36', acao: 'pneus' },
];

export const MOCK_CUSTO_SEMANAL: number[] = [15980, 15420, 16210, 15760, 14980, 16480, 15120, 15890];

export const MOCK_FLAGGED_TIRES: FlaggedTire[] = [
  { v: 'SQP-7D45', pos: 'Traseiro esquerdo', obs: 'Desgaste irregular na banda interna — recomendada troca imediata', vist: '18 jul', nv: 'critico' },
  { v: 'RKM-2E88', pos: 'Dianteiro direito', obs: 'Bolha na lateral externa — monitorar e evitar carga máxima', vist: '16 jul', nv: 'atencao' },
  { v: 'RYD-5H36', pos: 'Dianteiro direito', obs: 'Sulco em 2,1 mm — próximo do limite legal de 1,6 mm', vist: '15 jul', nv: 'atencao' },
];

export const MOCK_INSPECTIONS: Inspection[] = [
  { v: 'RYD-5H36', data: '19 jul · 08:12', mot: 'Ana Beltrão', itens: [{ n: 'Pneus', ok: true, obs: '' }, { n: 'Luzes e setas', ok: true, obs: '' }, { n: 'Nível de óleo', ok: true, obs: '' }, { n: 'Lataria', ok: true, obs: '' }, { n: 'Documentos', ok: true, obs: '' }] },
  { v: 'SQP-7D45', data: '18 jul · 07:48', mot: 'Carla Nunes', itens: [{ n: 'Pneus', ok: false, obs: 'traseiro esquerdo sinalizado' }, { n: 'Luzes e setas', ok: true, obs: '' }, { n: 'Nível de óleo', ok: false, obs: 'nível baixo' }, { n: 'Lataria', ok: true, obs: '' }, { n: 'Documentos', ok: true, obs: '' }] },
  { v: 'RKM-2E88', data: '16 jul · 09:05', mot: 'Otávio Dias', itens: [{ n: 'Pneus', ok: false, obs: 'dianteiro direito com bolha' }, { n: 'Luzes e setas', ok: true, obs: '' }, { n: 'Nível de óleo', ok: true, obs: '' }, { n: 'Lataria', ok: false, obs: 'risco na porta lateral' }, { n: 'Documentos', ok: true, obs: '' }] },
];

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

