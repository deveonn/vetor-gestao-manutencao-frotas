import {
  Alert, Driver, FlaggedTire, Fornecedor, FuelEntry, Inspection, MaintenanceHistoryEntry,
  MaintenanceItem, MaintenancePlan, ReportCategory, ReportVehicleCost, WeekPoint,
} from './models';

export const MOCK_ALERTS: Alert[] = [
  { nv: 'critico', t: 'Troca de óleo vencida há 340 km', v: 'SQP-7D45', acao: 'manutencao' },
  { nv: 'critico', t: 'Pneu traseiro esquerdo sinalizado na vistoria de 18 jul', v: 'SQP-7D45', acao: 'pneus' },
  { nv: 'atencao', t: 'Consumo anômalo: 6,4 km/L contra média de 8,3', v: 'RKM-2E88', acao: 'combustivel' },
  { nv: 'atencao', t: 'CNH de Marcos Teixeira vence em 12 dias', v: 'TQJ-1F77', acao: 'motoristas' },
  { nv: 'atencao', t: 'Troca de óleo em 850 km', v: 'RKM-2E88', acao: 'manutencao' },
  { nv: 'info', t: 'Vistoria recebida do app — sem apontamentos', v: 'RYD-5H36', acao: 'pneus' },
];

export const MOCK_FORNECEDORES: Fornecedor[] = [
  { id: 1, nome: 'Ipiranga BR-116', endereco: 'BR-116, km 234', cidade: 'Guarulhos', telefone: '(11) 4123-5566' },
  { id: 2, nome: 'Shell Anchieta', endereco: 'Rod. Anchieta, km 18', cidade: 'São Bernardo do Campo', telefone: null },
  { id: 3, nome: 'Posto Alvorada', endereco: 'Av. Alvorada, 900', cidade: 'São Paulo', telefone: '(11) 3345-8820' },
  { id: 4, nome: 'Petrobras Centro', endereco: 'Rua XV de Novembro, 120', cidade: 'São Paulo', telefone: null },
];

export const MOCK_FUEL: FuelEntry[] = [
  { data: '19 jul', v: 'SQP-7D45', l: 62.4, val: 387.5, hod: 121480, fornecedorId: 1, kml: 7.1, anom: false },
  { data: '19 jul', v: 'RKM-2E88', l: 58.0, val: 359.6, hod: 97115, fornecedorId: 2, kml: 6.4, anom: true },
  { data: '18 jul', v: 'RTX-4B21', l: 41.2, val: 255.4, hod: 84312, fornecedorId: 3, kml: 9.4, anom: false },
  { data: '18 jul', v: 'RYD-5H36', l: 64.8, val: 401.8, hod: 143972, fornecedorId: 1, kml: 7.6, anom: false },
  { data: '17 jul', v: 'TAV-9C10', l: 38.5, val: 238.7, hod: 45902, fornecedorId: 4, kml: 11.8, anom: false },
  { data: '16 jul', v: 'TQJ-1F77', l: 40.0, val: 248.0, hod: 58660, fornecedorId: 3, kml: 9.9, anom: false },
  { data: '15 jul', v: 'SBF-6A03', l: 70.3, val: 435.9, hod: 132240, fornecedorId: 2, kml: 6.9, anom: false },
  { data: '14 jul', v: 'RKM-2E88', l: 55.1, val: 341.6, hod: 96204, fornecedorId: 1, kml: 8.1, anom: false },
];

export const MOCK_KML_SEMANAL: WeekPoint[] = [
  { lbl: '25 mai', val: 8.2 }, { lbl: '1 jun', val: 8.5 }, { lbl: '8 jun', val: 8.3 }, { lbl: '15 jun', val: 8.6 },
  { lbl: '22 jun', val: 8.1 }, { lbl: '29 jun', val: 8.9 }, { lbl: '6 jul', val: 7.4 }, { lbl: '13 jul', val: 8.7 },
];

export const MOCK_CUSTO_SEMANAL: number[] = [15980, 15420, 16210, 15760, 14980, 16480, 15120, 15890];

export const MOCK_MAINTENANCE: MaintenanceItem[] = [
  { id: 'm1', v: 'SQP-7D45', item: 'Troca de óleo e filtro', resta: -340, nv: 'critico', prazo: 'vencida há 340 km' },
  { id: 'm2', v: 'RKM-2E88', item: 'Troca de óleo e filtro', resta: 850, nv: 'atencao', prazo: 'em 850 km ou 12 dias' },
  { id: 'm3', v: 'RYD-5H36', item: 'Correia dentada', resta: 1480, nv: 'atencao', prazo: 'em 1.480 km' },
  { id: 'm4', v: 'RTX-4B21', item: 'Troca de óleo e filtro', resta: 1220, nv: 'atencao', prazo: 'em 1.220 km' },
  { id: 'm5', v: 'SBF-6A03', item: 'Pastilhas de freio', resta: 2900, nv: 'ok', prazo: 'em 2.900 km' },
];

export const MOCK_MAINTENANCE_HISTORY: MaintenanceHistoryEntry[] = [
  { data: '12 jul', v: 'SBF-6A03', item: 'Corretiva — pastilhas e discos de freio', custo: 1180, ofi: 'Oficina Mecvel' },
  { data: '28 jun', v: 'RTX-4B21', item: 'Troca de óleo e filtro', custo: 420, ofi: 'Lubrax Express' },
  { data: '21 jun', v: 'TAV-9C10', item: 'Troca de óleo e filtro', custo: 395, ofi: 'Lubrax Express' },
  { data: '9 jun', v: 'RYD-5H36', item: 'Alinhamento e balanceamento', custo: 260, ofi: 'Pneuforte' },
  { data: '2 jun', v: 'SQP-7D45', item: 'Troca de óleo e filtro', custo: 510, ofi: 'Oficina Mecvel' },
];

export const MOCK_PLANS: MaintenancePlan[] = [
  { tipo: 'Utilitário — Fiorino, Saveiro', itens: [{ item: 'Óleo e filtro', km: '10.000 km', tempo: '6 meses' }, { item: 'Filtro de ar', km: '20.000 km', tempo: '12 meses' }, { item: 'Pastilhas de freio', km: '30.000 km', tempo: '—' }] },
  { tipo: 'Van de carga — Master, Sprinter', itens: [{ item: 'Óleo e filtro', km: '15.000 km', tempo: '12 meses' }, { item: 'Correia dentada', km: '60.000 km', tempo: '48 meses' }, { item: 'Pastilhas de freio', km: '25.000 km', tempo: '—' }] },
  { tipo: 'Caminhão leve — HR, Daily', itens: [{ item: 'Óleo e filtro', km: '15.000 km', tempo: '12 meses' }, { item: 'Filtro de combustível', km: '30.000 km', tempo: '—' }, { item: 'Pastilhas de freio', km: '25.000 km', tempo: '—' }] },
];

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

export const MOCK_DRIVERS: Driver[] = [
  { nome: 'João Prates', cat: 'C', val: '03/2028', dias: null, v: 'RTX-4B21', desde: 'fev 2025' },
  { nome: 'Carla Nunes', cat: 'D', val: '11/2027', dias: null, v: 'SQP-7D45', desde: 'ago 2024' },
  { nome: 'Diego Ramos', cat: 'B', val: '07/2029', dias: null, v: 'TAV-9C10', desde: 'jan 2026' },
  { nome: 'Otávio Dias', cat: 'C', val: '01/2027', dias: null, v: 'RKM-2E88', desde: 'mai 2025' },
  { nome: 'Marcos Teixeira', cat: 'C', val: '01/08/2026', dias: 12, v: 'TQJ-1F77', desde: 'out 2024' },
  { nome: 'Ana Beltrão', cat: 'D', val: '05/2028', dias: null, v: 'RYD-5H36', desde: 'mar 2025' },
  { nome: 'Paulo Cezar', cat: 'B', val: '09/2026', dias: 62, v: null, desde: null },
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

