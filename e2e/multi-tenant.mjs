// e2e: isolamento entre empresas (multi-tenant) — backend #6. Só API (o navegador da suíte não é usado).
// Cria uma 2ª empresa direto no banco (não há rota de cadastro de empresa), com gestor e motorista, e confere que
// nenhuma rota deixa uma empresa ler ou mexer nos dados da outra. Ver e2e/README.md.
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ADMIN, MOTORISTA, suite } from './lib.mjs';

const require = createRequire(new URL('../vetor-backend/package.json', import.meta.url));
const bcrypt = require('bcrypt');

await suite('Multi-tenant: isolamento entre empresas (backend #6)', async ({ API, check, sql }) => {
  const rnd = Math.floor(1000 + Math.random() * 9000);
  const empB = `e2e-emp-${rnd}`;
  const req = async (token, path, method = 'GET', body) => {
    const r = await fetch(`${API}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const login = async (l, s) => (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: l, senha: s }) })).json()).accessToken;

  const hash = await bcrypt.hash('senhaB123', 10);
  sql(`
    INSERT INTO empresas (id, nome, cnpj, "contatoNome", "contatoEmail", "contatoFone") VALUES ('${empB}', 'Empresa B E2E', '00.000.${rnd}/0001-00', 'Beto', 'beto${rnd}@empresab.e2e', '(11) 0000-0000');
    INSERT INTO motoristas (id, "empresaId", nome, "categoriaCnh") VALUES ('${empB}-mot', '${empB}', 'Motorista B E2E', 'B');
    INSERT INTO usuarios (id, papel, email, "senhaHash", "empresaId") VALUES ('${empB}-adm', 'ADMIN', 'beto${rnd}@empresab.e2e', '${hash}', '${empB}');
    INSERT INTO usuarios (id, papel, usuario, "senhaHash", "empresaId", "motoristaId") VALUES ('${empB}-musr', 'MOTORISTA', 'e2e.motb${rnd}', '${hash}', '${empB}', '${empB}-mot');
  `);
  try {
    const admA = await login(ADMIN.login, ADMIN.senha);
    const admB = await login(`beto${rnd}@empresab.e2e`, 'senhaB123');
    const motB = await login(`e2e.motb${rnd}`, 'senhaB123');
    check('gestor e motorista da empresa B entram', !!admB && !!motB);

    // dados da empresa A (os do seed)
    const veicA = (await req(admA, '/veiculos')).json[0];
    const motA = (await req(admA, '/motoristas')).json[0];
    const manA = (await req(admA, '/manutencoes/pendentes')).json[0];
    const fornA = (await req(admA, '/fornecedores')).json[0];

    // 1) leitura: B não vê nada de A
    const motsB = (await req(admB, '/motoristas')).json;
    check('motoristas de B: só o próprio (nenhum da empresa A)', motsB.length === 1 && motsB[0].id === `${empB}-mot`, motsB.map((m) => m.nome).join(', '));
    const listas = ['/veiculos', '/abastecimentos', '/fornecedores', '/manutencoes/pendentes', '/manutencoes/historico', '/vistorias', '/pneus/sinalizados', '/dashboard/alertas'];
    const vazias = [];
    for (const p of listas) { const r = await req(admB, p); if (r.status === 200 && Array.isArray(r.json) && r.json.length === 0) vazias.push(p); }
    check('empresa B nova: todas as listas vazias (nada da empresa A vaza)', vazias.length === listas.length, `vazias ${vazias.length}/${listas.length}: faltou ${listas.filter((p) => !vazias.includes(p)).join(', ')}`);
    const resumoB = (await req(admB, '/dashboard/resumo')).json;
    const custoB = (await req(admB, '/relatorios/custo-por-veiculo')).json;
    check('dashboard e relatórios de B zerados', resumoB.totalVeiculos === 0 && resumoB.custoSemana === 0 && resumoB.totalAlertas === 0 && Array.isArray(custoB) && custoB.length === 0, JSON.stringify(resumoB));
    check('GET /empresa de B devolve a empresa B', (await req(admB, '/empresa')).json?.nome === 'Empresa B E2E');

    // 2) acesso direto por id de A: sempre 404 (nunca 403, que confirmaria que o id existe)
    const tentativas = [
      ['GET', `/veiculos/${veicA.id}`], ['PATCH', `/veiculos/${veicA.id}`, { modelo: 'hack' }], ['DELETE', `/veiculos/${veicA.id}`],
      ['PATCH', `/veiculos/${veicA.id}/oficina`, { naOficina: true }], ['DELETE', `/veiculos/${veicA.id}/foto`],
      ['GET', `/veiculos/${veicA.id}/vinculos`], ['POST', `/veiculos/${veicA.id}/vinculos`, { motoristaId: `${empB}-mot` }],
      ['PATCH', `/motoristas/${motA.id}`, { nome: 'hack' }], ['DELETE', `/motoristas/${motA.id}`], ['PUT', `/motoristas/${motA.id}/acesso`, { senha: 'hack123' }],
      ['POST', `/manutencoes/${manA.id}/concluir`, { custo: 1 }], ['POST', '/manutencoes', { veiculoId: veicA.id, item: 'hack', kmAlvo: 1 }],
      ['POST', '/abastecimentos', { veiculoId: veicA.id, fornecedorId: fornA.id, litros: 1, valor: 1, hodometro: 1 }],
      ['DELETE', `/fornecedores/${fornA.id}`],
    ];
    const vazou = [];
    for (const [m, p, b] of tentativas) { const r = await req(admB, p, m, b); if (r.status !== 404) vazou.push(`${m} ${p} -> ${r.status}`); }
    check(`gestor B usando ids da empresa A: 404 em todas as ${tentativas.length} rotas`, vazou.length === 0, vazou.join(' | '));

    // 3) nada de A mudou com as tentativas
    const veicA2 = (await req(admA, `/veiculos/${veicA.id}`)).json;
    const motA2 = (await req(admA, '/motoristas')).json.find((m) => m.id === motA.id);
    check('dados da empresa A intactos depois das tentativas', veicA2.modelo === veicA.modelo && veicA2.status === veicA.status && !veicA2.arquivadoEm && motA2?.nome === motA.nome && (await req(admA, '/manutencoes/pendentes')).json.some((m) => m.id === manA.id) && (await req(admA, '/fornecedores')).json.some((f) => f.id === fornA.id));

    // 4) motorista de B: vistoria no veículo de A -> 404; foto de A na vistoria -> 400; veículo do dia não é de A
    const vB = (await req(admB, '/veiculos', 'POST', { placa: veicA.placa, tipo: 'UTILITARIO' }));
    check('placa é única por empresa: B pode cadastrar a mesma placa que A', vB.status === 201 && vB.json.placa === veicA.placa, `status=${vB.status}`);
    await req(admB, `/veiculos/${vB.json.id}/vinculos`, 'POST', { motoristaId: `${empB}-mot` });
    const doDia = (await req(motB, '/motorista/veiculo-do-dia')).json;
    check('veículo do dia do motorista B é o de B (mesma placa, outro id)', doDia?.id === vB.json.id && doDia.id !== veicA.id);
    const vistA = await req(motB, '/vistorias', 'POST', { veiculoId: veicA.id, itens: [{ stepId: 'freios', label: 'freios', avaliacao: 'OK' }] });
    const motATok = await login(MOTORISTA.login, MOTORISTA.senha);
    const form = new FormData();
    form.append('arquivo', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')], { type: 'image/png' }), 'f.png');
    const midiaA = await (await fetch(`${API}/midia`, { method: 'POST', headers: { Authorization: `Bearer ${motATok}` }, body: form })).json();
    const vistFotoA = await req(motB, '/vistorias', 'POST', { veiculoId: vB.json.id, itens: [{ stepId: 'lataria', label: 'lataria', avaliacao: 'ATENCAO', midiaId: midiaA.id }] });
    check('motorista B: vistoria no veículo de A -> 404; usando foto enviada por A -> 400', vistA.status === 404 && vistFotoA.status === 400, `${vistA.status}/${vistFotoA.status}`);
    sql(`DELETE FROM midias WHERE id = '${midiaA.id}';`);
    if (midiaA.url?.startsWith('/uploads/')) rmSync(fileURLToPath(new URL(`../vetor-backend${midiaA.url}`, import.meta.url)), { force: true });

    // 5) o inverso: A não vê nada de B
    const vAdeB = await req(admA, `/veiculos/${vB.json.id}`);
    const motsA = (await req(admA, '/motoristas')).json;
    check('empresa A não vê o veículo nem o motorista de B', vAdeB.status === 404 && !motsA.some((m) => m.id === `${empB}-mot`) && !(await req(admA, '/veiculos')).json.some((v) => v.id === vB.json.id));
  } finally {
    // empresa B some com tudo dela (cascata)
    sql(`DELETE FROM empresas WHERE id = '${empB}';`);
  }
});
