// e2e: Motoristas (Web #6). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Motoristas (Web #6)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const linhas = () => evalJs(`[...document.querySelectorAll('.card .row')].map(r => [...r.children].map(c => c.textContent.trim()))`);
  const linha = async (nome) => (await linhas()).find((l) => l[0] === nome);
  const clicar = (txt, espera = 1200) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(txt)} || b.textContent.trim().endsWith(${JSON.stringify(txt)})).click(); await new Promise(r => setTimeout(r, ${espera})); })()`);
  const cadastrar = (nome, cat, val) => evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Cadastrar motorista')).click();
    await new Promise(r => setTimeout(r, 300));
    const d = document.querySelector('.modal-dialog');
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
    set(d.querySelector('input'), ${JSON.stringify(nome)}); set(d.querySelector('select'), ${JSON.stringify(cat)}); set(d.querySelector('input[type=date]'), ${JSON.stringify(val)});
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cadastrar motorista').click();
    await new Promise(r => setTimeout(r, 1500));
    const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
    if (document.querySelector('.modal-dialog')) [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return erro;
  })()`);
  const iso = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  const nomes = { ok: `Teste E2E ${rnd} Emdia`, vence: `Teste E2E ${rnd} Vence`, vencida: `Teste E2E ${rnd} Vencida`, sem: `Teste E2E ${rnd} Semval` };

  await loginAdmin();

  const mot0 = await api('/motoristas');
  await goto(`${APP}/motoristas`);
  let ls = await linhas();
  check('lista de motoristas = GET /motoristas', JSON.stringify(ls.map((l) => l[0])) === JSON.stringify(mot0.map((m) => m.nome)), `${ls.length} tela / ${mot0.length} API`);
  const comVeic = mot0.filter((m) => m.veiculoAtual.length);
  check('veículo e "vínculo desde" batem com a API', comVeic.every((m) => { const l = ls.find((x) => x[0] === m.nome); return l[4] === m.veiculoAtual[0].placa && l[5].startsWith('desde '); }) && comVeic.length > 0, `${comVeic.length} vinculados`);

  let erro = await cadastrar('   ', 'B', '');
  check('nome vazio bloqueado no form', erro.includes('Informe o nome'), erro);

  erro = await cadastrar(nomes.vence, 'D', iso(15));
  let l = await linha(nomes.vence);
  const criadoApi = (await api('/motoristas')).find((m) => m.nome === nomes.vence);
  check('cadastrar -> aparece com CNH D, validade mm/aaaa e "vence em N dias"', !erro && l && l[1] === 'D' && /^\d{2}\/\d{4}$/.test(l[2]) && /vence em 1[45] dias/.test(l[3]) && l[4] === 'sem vínculo' && criadoApi?.categoriaCnh === 'D', JSON.stringify(l) + erro);

  await cadastrar(nomes.ok, 'C', iso(400));
  await cadastrar(nomes.vencida, 'B', iso(-10));
  await cadastrar(nomes.sem, 'E', '');
  check('situação da CNH: em dia / vencida / sem validade', (await linha(nomes.ok))?.[3] === 'em dia' && (await linha(nomes.vencida))?.[3] === 'vencida' && (await linha(nomes.sem))?.[3] === 'sem validade' && (await linha(nomes.sem))?.[2] === '—');

  await goto(`${APP}/motoristas`);
  check('cadastrados persistem após reload', [nomes.ok, nomes.vence, nomes.vencida, nomes.sem].every((n) => ls = true) && (await linhas()).filter((x) => x[0].startsWith(`Teste E2E ${rnd}`)).length === 4);

  // vínculo com veículo que depois é arquivado não pode continuar aparecendo
  const placa = 'TST-' + rnd;
  const veic = await api('/veiculos', 'POST', { placa, tipo: 'UTILITARIO' });
  await api(`/veiculos/${veic.id}/vinculos`, 'POST', { motoristaId: criadoApi.id });
  await goto(`${APP}/motoristas`);
  l = await linha(nomes.vence);
  check('vínculo novo aparece com placa e "desde"', l?.[4] === placa && l?.[5].startsWith('desde '), JSON.stringify(l));
  await api(`/veiculos/${veic.id}`, 'DELETE');
  await goto(`${APP}/motoristas`);
  l = await linha(nomes.vence);
  check('veículo arquivado some do motorista (sem vínculo)', l?.[4] === 'sem vínculo' && l?.[5] === '—', JSON.stringify(l));
});
