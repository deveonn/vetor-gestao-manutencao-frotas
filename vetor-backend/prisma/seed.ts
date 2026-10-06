/**
 * Popula um banco vazio com os mesmos dados do mock do painel web
 * (vetor-app-web/src/app/core/mock-data.ts), pra ter algo real pra bater nos
 * endpoints via Swagger/Postman assim que a API sobe. Rodar com `npm run prisma:seed`.
 */
import { PrismaClient, Papel, TipoVeiculo, StatusVeiculo, Severidade, StatusManutencao, StatusIntegracaoRastreamento, AvaliacaoVistoria } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SENHA_PADRAO = 'demo123';
const TIRE_LABELS = ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo', 'traseiro direito'];

function slugUsuario(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('.');
}

async function main() {
  // o seed só cria (não limpa): num banco que já tem dados duplicaria tudo — inclusive em produção
  if ((await prisma.empresa.count()) > 0) {
    console.log('Banco já tem dados — seed ignorado. Pra recriar o cenário demo em dev: npx prisma migrate reset.');
    return;
  }

  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Transportes Almeida Ltda',
      cnpj: '12.456.789/0001-30',
      contatoNome: 'Rui Almeida',
      contatoEmail: 'rui@transportesalmeida.com.br',
      contatoFone: '(11) 98122-4437',
    },
  });

  await prisma.usuario.create({
    data: { papel: Papel.ROOT, email: 'root@vetor.dev', senhaHash },
  });

  await prisma.usuario.create({
    data: { papel: Papel.ADMIN, email: empresa.contatoEmail, senhaHash, empresaId: empresa.id },
  });

  await prisma.integracaoRastreamento.create({
    data: {
      empresaId: empresa.id,
      status: StatusIntegracaoRastreamento.CONECTADO,
      tokenHash: await bcrypt.hash('hap_live_seed_token', 10),
      tokenCauda: 'x4T9',
      conectadoEm: new Date(),
    },
  });

  const motoristasSeed = [
    { nome: 'João Prates', categoriaCnh: 'C', validadeCnh: new Date('2028-03-01') },
    { nome: 'Carla Nunes', categoriaCnh: 'D', validadeCnh: new Date('2027-11-01') },
    { nome: 'Diego Ramos', categoriaCnh: 'B', validadeCnh: new Date('2029-07-01') },
    { nome: 'Otávio Dias', categoriaCnh: 'C', validadeCnh: new Date('2027-01-01') },
    { nome: 'Marcos Teixeira', categoriaCnh: 'C', validadeCnh: new Date('2026-08-01') },
    { nome: 'Ana Beltrão', categoriaCnh: 'D', validadeCnh: new Date('2028-05-01') },
    { nome: 'Paulo Cezar', categoriaCnh: 'B', validadeCnh: new Date('2026-09-01') },
  ];

  const motoristas = new Map<string, string>();
  for (const m of motoristasSeed) {
    const motorista = await prisma.motorista.create({
      data: { empresaId: empresa.id, nome: m.nome, categoriaCnh: m.categoriaCnh, validadeCnh: m.validadeCnh },
    });
    motoristas.set(m.nome, motorista.id);
    await prisma.usuario.create({
      data: { papel: Papel.MOTORISTA, usuario: slugUsuario(m.nome), senhaHash, empresaId: empresa.id, motoristaId: motorista.id },
    });
  }

  const veiculosSeed = [
    { placa: 'RTX-4B21', modelo: 'Fiat Fiorino', tipo: TipoVeiculo.UTILITARIO, mot: 'João Prates', hod: 84312, comb: 62, kml: 9.4, troca: 1220, status: StatusVeiculo.RODANDO, pneus: ['ok', 'ok', 'ok', 'ok'], kmHoje: 212 },
    { placa: 'SQP-7D45', modelo: 'Renault Master', tipo: TipoVeiculo.VAN_CARGA, mot: 'Carla Nunes', hod: 121480, comb: 34, kml: 7.1, troca: -340, status: StatusVeiculo.RODANDO, pneus: ['ok', 'ok', 'critico', 'ok'], kmHoje: 187 },
    { placa: 'TAV-9C10', modelo: 'VW Saveiro', tipo: TipoVeiculo.UTILITARIO, mot: 'Diego Ramos', hod: 45902, comb: 78, kml: 11.8, troca: 4100, status: StatusVeiculo.RODANDO, pneus: ['ok', 'ok', 'ok', 'ok'], kmHoje: 154 },
    { placa: 'RKM-2E88', modelo: 'Hyundai HR', tipo: TipoVeiculo.CAMINHAO_LEVE, mot: 'Otávio Dias', hod: 97115, comb: 51, kml: 6.4, troca: 850, status: StatusVeiculo.RODANDO, pneus: ['ok', 'atencao', 'ok', 'ok'], kmHoje: 231 },
    { placa: 'SBF-6A03', modelo: 'Iveco Daily', tipo: TipoVeiculo.CAMINHAO_LEVE, mot: null, hod: 132240, comb: 45, kml: 6.9, troca: 2900, status: StatusVeiculo.MANUTENCAO, pneus: ['ok', 'ok', 'ok', 'ok'], kmHoje: 0 },
    { placa: 'TQJ-1F77', modelo: 'Fiat Fiorino', tipo: TipoVeiculo.UTILITARIO, mot: 'Marcos Teixeira', hod: 58660, comb: 88, kml: 9.9, troca: 5300, status: StatusVeiculo.RODANDO, pneus: ['ok', 'ok', 'ok', 'ok'], kmHoje: 198 },
    { placa: 'RYD-5H36', modelo: 'Mercedes Sprinter 415', tipo: TipoVeiculo.VAN_CARGA, mot: 'Ana Beltrão', hod: 143972, comb: 22, kml: 7.6, troca: 1480, status: StatusVeiculo.RODANDO, pneus: ['ok', 'atencao', 'ok', 'ok'], kmHoje: 243 },
    { placa: 'SNC-8G54', modelo: 'VW Saveiro', tipo: TipoVeiculo.UTILITARIO, mot: null, hod: 39480, comb: 95, kml: 12.1, troca: 6800, status: StatusVeiculo.PARADO, pneus: ['ok', 'ok', 'ok', 'ok'], kmHoje: 0 },
  ];

  const veiculos = new Map<string, string>();
  for (const v of veiculosSeed) {
    const veiculo = await prisma.veiculo.create({
      data: {
        empresaId: empresa.id,
        placa: v.placa,
        modelo: v.modelo,
        tipo: v.tipo,
        status: v.status,
        hodometro: v.hod,
        nivelCombustivel: v.comb,
        kmL: v.kml,
        kmParaTroca: v.troca,
        kmHoje: v.kmHoje,
        motoristaAtualId: v.mot ? motoristas.get(v.mot) : null,
      },
    });
    veiculos.set(v.placa, veiculo.id);

    // mock tem 4 valores (DE, DD, TE, TD); caminhão leve tem traseiro duplo — o traseiro do mock vira o "interno"
    // e o "externo" nasce OK (mesma regra da migration 20260923160000)
    const posicoes =
      v.tipo === TipoVeiculo.CAMINHAO_LEVE
        ? [
            { posicao: TIRE_LABELS[0], sev: v.pneus[0] },
            { posicao: TIRE_LABELS[1], sev: v.pneus[1] },
            { posicao: `${TIRE_LABELS[2]} interno`, sev: v.pneus[2] },
            { posicao: `${TIRE_LABELS[2]} externo`, sev: 'ok' },
            { posicao: `${TIRE_LABELS[3]} interno`, sev: v.pneus[3] },
            { posicao: `${TIRE_LABELS[3]} externo`, sev: 'ok' },
          ]
        : v.pneus.map((sev, i) => ({ posicao: TIRE_LABELS[i], sev }));
    await prisma.pneuPosicao.createMany({
      data: posicoes.map(({ posicao, sev }) => ({
        veiculoId: veiculo.id,
        posicao,
        severidade: sev === 'critico' ? Severidade.CRITICO : sev === 'atencao' ? Severidade.ATENCAO : Severidade.OK,
      })),
    });

    if (v.mot) {
      await prisma.vinculoMotoristaVeiculo.create({
        data: { veiculoId: veiculo.id, motoristaId: motoristas.get(v.mot)!, de: new Date('2024-08-01') },
      });
    }
  }

  const fornecedoresSeed = [
    { nome: 'Ipiranga BR-116', endereco: 'BR-116, km 234', cidade: 'Guarulhos', telefone: '(11) 4123-5566' },
    { nome: 'Shell Anchieta', endereco: 'Rod. Anchieta, km 18', cidade: 'São Bernardo do Campo', telefone: null },
    { nome: 'Posto Alvorada', endereco: 'Av. Alvorada, 900', cidade: 'São Paulo', telefone: '(11) 3345-8820' },
    { nome: 'Petrobras Centro', endereco: 'Rua XV de Novembro, 120', cidade: 'São Paulo', telefone: null },
  ];
  const fornecedores: string[] = [];
  for (const f of fornecedoresSeed) {
    const fornecedor = await prisma.fornecedor.create({ data: { empresaId: empresa.id, ...f } });
    fornecedores.push(fornecedor.id);
  }

  const abastecimentosSeed = [
    { placa: 'SQP-7D45', l: 62.4, val: 387.5, hod: 121480, forn: 0, kml: 7.1, anom: false, diasAtras: 6 },
    { placa: 'RKM-2E88', l: 58.0, val: 359.6, hod: 97115, forn: 1, kml: 6.4, anom: true, diasAtras: 6 },
    { placa: 'RTX-4B21', l: 41.2, val: 255.4, hod: 84312, forn: 2, kml: 9.4, anom: false, diasAtras: 7 },
    { placa: 'RYD-5H36', l: 64.8, val: 401.8, hod: 143972, forn: 0, kml: 7.6, anom: false, diasAtras: 7 },
    { placa: 'TAV-9C10', l: 38.5, val: 238.7, hod: 45902, forn: 3, kml: 11.8, anom: false, diasAtras: 8 },
    { placa: 'TQJ-1F77', l: 40.0, val: 248.0, hod: 58660, forn: 2, kml: 9.9, anom: false, diasAtras: 9 },
    { placa: 'SBF-6A03', l: 70.3, val: 435.9, hod: 132240, forn: 1, kml: 6.9, anom: false, diasAtras: 10 },
    { placa: 'RKM-2E88', l: 55.1, val: 341.6, hod: 96204, forn: 0, kml: 8.1, anom: false, diasAtras: 11 },
  ];
  for (const a of abastecimentosSeed) {
    const data = new Date();
    data.setDate(data.getDate() - a.diasAtras);
    await prisma.abastecimento.create({
      data: {
        empresaId: empresa.id,
        veiculoId: veiculos.get(a.placa)!,
        fornecedorId: fornecedores[a.forn],
        litros: a.l,
        valor: a.val,
        hodometro: a.hod,
        kmL: a.kml,
        anomalo: a.anom,
        data,
      },
    });
  }

  // pendentes do mock ("em 850 km ou 12 dias") viram meta: kmAlvo = hodômetro + km restante, dataLimite = hoje + dias.
  // Km restante, urgência e prazo são calculados na leitura (src/manutencoes/situacao.ts).
  const manutencoesPendentesSeed = [
    { placa: 'SQP-7D45', item: 'Troca de óleo e filtro', kmRestante: -340 },
    { placa: 'RKM-2E88', item: 'Troca de óleo e filtro', kmRestante: 850, dias: 12 },
    { placa: 'RYD-5H36', item: 'Correia dentada', kmRestante: 1480 },
    { placa: 'RTX-4B21', item: 'Troca de óleo e filtro', kmRestante: 1220 },
    { placa: 'SBF-6A03', item: 'Pastilhas de freio', kmRestante: 2900 },
  ];
  for (const m of manutencoesPendentesSeed) {
    const hod = veiculosSeed.find((v) => v.placa === m.placa)!.hod;
    const dataLimite = m.dias != null ? new Date(Date.now() + m.dias * 24 * 60 * 60 * 1000) : null;
    await prisma.manutencao.create({
      data: {
        empresaId: empresa.id,
        veiculoId: veiculos.get(m.placa)!,
        item: m.item,
        status: StatusManutencao.PENDENTE,
        kmAlvo: hod + m.kmRestante,
        dataLimite: dataLimite ? new Date(dataLimite.toISOString().slice(0, 10)) : null,
      },
    });
  }

  const manutencoesHistoricoSeed = [
    { placa: 'SBF-6A03', item: 'Corretiva — pastilhas e discos de freio', custo: 1180, oficina: 'Oficina Mecvel', diasAtras: 20 },
    { placa: 'RTX-4B21', item: 'Troca de óleo e filtro', custo: 420, oficina: 'Lubrax Express', diasAtras: 34 },
    { placa: 'TAV-9C10', item: 'Troca de óleo e filtro', custo: 395, oficina: 'Lubrax Express', diasAtras: 41 },
    { placa: 'RYD-5H36', item: 'Alinhamento e balanceamento', custo: 260, oficina: 'Pneuforte', diasAtras: 53 },
    { placa: 'SQP-7D45', item: 'Troca de óleo e filtro', custo: 510, oficina: 'Oficina Mecvel', diasAtras: 60 },
  ];
  for (const m of manutencoesHistoricoSeed) {
    const concluidoEm = new Date();
    concluidoEm.setDate(concluidoEm.getDate() - m.diasAtras);
    await prisma.manutencao.create({
      data: { empresaId: empresa.id, veiculoId: veiculos.get(m.placa)!, item: m.item, status: StatusManutencao.CONCLUIDA, custo: m.custo, oficina: m.oficina, concluidoEm },
    });
  }

  const planosSeed: { tipo: TipoVeiculo; itens: { item: string; km: string; tempo: string }[] }[] = [
    { tipo: TipoVeiculo.UTILITARIO, itens: [{ item: 'Óleo e filtro', km: '10.000 km', tempo: '6 meses' }, { item: 'Filtro de ar', km: '20.000 km', tempo: '12 meses' }, { item: 'Pastilhas de freio', km: '30.000 km', tempo: '—' }] },
    { tipo: TipoVeiculo.VAN_CARGA, itens: [{ item: 'Óleo e filtro', km: '15.000 km', tempo: '12 meses' }, { item: 'Correia dentada', km: '60.000 km', tempo: '48 meses' }, { item: 'Pastilhas de freio', km: '25.000 km', tempo: '—' }] },
    { tipo: TipoVeiculo.CAMINHAO_LEVE, itens: [{ item: 'Óleo e filtro', km: '15.000 km', tempo: '12 meses' }, { item: 'Filtro de combustível', km: '30.000 km', tempo: '—' }, { item: 'Pastilhas de freio', km: '25.000 km', tempo: '—' }] },
  ];
  for (const p of planosSeed) {
    await prisma.planoManutencao.create({
      data: { empresaId: empresa.id, tipoVeiculo: p.tipo, itens: { createMany: { data: p.itens } } },
    });
  }

  // Vistorias — stepIds canônicos vêm do checklist mobile (CHECKLIST_CONFIG em
  // core/models/inspection.model.ts): pneus, oleo-agua, luzes-setas, freios, lataria.
  const vistoriasSeed = [
    {
      placa: 'RYD-5H36', mot: 'Ana Beltrão', diasAtras: 6,
      itens: [
        { stepId: 'pneus', label: 'dianteiro esquerdo', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'oleo-agua', label: 'óleo e água', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'luzes-setas', label: 'luzes e setas', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'freios', label: 'freios', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'lataria', label: 'lataria', avaliacao: AvaliacaoVistoria.OK },
      ],
      temAlertaCritico: false, temAlertaAtencao: false,
    },
    {
      placa: 'SQP-7D45', mot: 'Carla Nunes', diasAtras: 7,
      itens: [
        { stepId: 'pneus', label: 'traseiro esquerdo', avaliacao: AvaliacaoVistoria.TROCAR, observacao: 'traseiro esquerdo sinalizado' },
        { stepId: 'oleo-agua', label: 'óleo e água', avaliacao: AvaliacaoVistoria.ATENCAO, observacao: 'nível baixo' },
        { stepId: 'luzes-setas', label: 'luzes e setas', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'freios', label: 'freios', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'lataria', label: 'lataria', avaliacao: AvaliacaoVistoria.OK },
      ],
      temAlertaCritico: true, temAlertaAtencao: true,
    },
    {
      placa: 'RKM-2E88', mot: 'Otávio Dias', diasAtras: 9,
      itens: [
        { stepId: 'pneus', label: 'dianteiro direito', avaliacao: AvaliacaoVistoria.ATENCAO, observacao: 'dianteiro direito com bolha' },
        { stepId: 'oleo-agua', label: 'óleo e água', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'luzes-setas', label: 'luzes e setas', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'freios', label: 'freios', avaliacao: AvaliacaoVistoria.OK },
        { stepId: 'lataria', label: 'lataria', avaliacao: AvaliacaoVistoria.ATENCAO, observacao: 'risco na porta lateral' },
      ],
      temAlertaCritico: false, temAlertaAtencao: true,
    },
  ];
  for (const vi of vistoriasSeed) {
    const iniciadoEm = new Date();
    iniciadoEm.setDate(iniciadoEm.getDate() - vi.diasAtras);
    const concluidoEm = new Date(iniciadoEm.getTime() + 6 * 60 * 1000);
    await prisma.vistoria.create({
      data: {
        empresaId: empresa.id,
        veiculoId: veiculos.get(vi.placa)!,
        motoristaId: motoristas.get(vi.mot)!,
        iniciadoEm,
        concluidoEm,
        temAlertaCritico: vi.temAlertaCritico,
        temAlertaAtencao: vi.temAlertaAtencao,
        itens: { createMany: { data: vi.itens } },
      },
    });
  }

  console.log('Seed concluído.');
  console.log(`  root:      root@vetor.dev / ${SENHA_PADRAO}`);
  console.log(`  admin:     ${empresa.contatoEmail} / ${SENHA_PADRAO}`);
  console.log(`  motorista: ${[...motoristas.keys()].map(slugUsuario).join(', ')} / ${SENHA_PADRAO}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
