// e2e: Combustível (Web #7). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Combustível (Web #7)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const linhasAbast = () => evalJs(`[...[...document.querySelectorAll('.card')].find(c => c.querySelector('h2')?.textContent.trim() === 'Abastecimentos').querySelectorAll('.row')].map(r => [...r.children].map(c => c.textContent.trim()))`);
  const linhasForn = () => evalJs(`[...document.querySelectorAll('.forn-row')].map(r => [...r.children].map(c => c.textContent.trim()))`);
  const barras = () => evalJs(`(() => { const c = [...document.querySelectorAll('.card')].find(c => c.querySelector('h2')?.textContent.includes('km/L da frota')); return [...c.querySelectorAll(':scope > div:last-child span')].map(s => s.textContent.trim()); })()`);
  const valoresBarras = () => evalJs(`(() => { const c = [...document.querySelectorAll('.card')].find(c => c.querySelector('h2')?.textContent.includes('km/L da frota')); return [...c.querySelectorAll('div > div > span.mono')].filter(s => s.textContent.trim() !== '8 semanas').slice(0, 8).map(s => s.textContent.trim()); })()`);
  const abastecer = (placa, data, litros, valor, hodo) => evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Registrar abastecimento')).click();
    await new Promise(r => setTimeout(r, 300));
    const d = document.querySelector('.modal-dialog');
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
    set(d.querySelectorAll('select')[0], ${JSON.stringify(placa)});
    set(d.querySelector('input[type=date]'), ${JSON.stringify(data)});
    const ins = [...d.querySelectorAll('input.mono')];
    set(ins[0], ${JSON.stringify(litros)}); set(ins[1], ${JSON.stringify(valor)}); set(ins[2], ${JSON.stringify(hodo)});
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Registrar abastecimento').click();
    await new Promise(r => setTimeout(r, 1800));
    const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
    if (document.querySelector('.modal-dialog')) [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return erro;
  })()`);
  const iso = (dias) => { const d = new Date(Date.now() + dias * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const rnd = Math.floor(1000 + Math.random() * 9000);
  const placa = 'TST-' + rnd;
  const nomeForn = `Posto E2E ${rnd}`;

  await loginAdmin();
  const veic = await api('/veiculos', 'POST', { placa, tipo: 'UTILITARIO' });

  const ab0 = await api('/abastecimentos');
  await goto(`${APP}/combustivel`);
  let ls = await linhasAbast();
  const kmlF = (k) => (k == null ? '—' : k.toFixed(1).replace('.', ','));
  check('abastecimentos = GET /abastecimentos (placa, L, km/L, ordem)', ls.length === ab0.length && ab0.every((a, i) => ls[i][1] === a.veiculo.placa && ls[i][3] === a.litros.toFixed(1).replace('.', ',') && ls[i][5].endsWith(kmlF(a.kmL))), `${ls.length}/${ab0.length}`);

  const serie = await api('/abastecimentos/km-l-semanal?semanas=8');
  const vb = await valoresBarras();
  check('gráfico semanal: 8 barras = série da API (vazias com —)', vb.length === 8 && serie.every((s, i) => vb[i] === kmlF(s.kmLMedio)), JSON.stringify(vb));

  // fornecedores
  await evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Cadastrar fornecedor')).click();
    await new Promise(r => setTimeout(r, 300));
    const d = document.querySelector('.modal-dialog'); const ins = d.querySelectorAll('input');
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(ins[0], ${JSON.stringify(nomeForn)}); set(ins[2], 'Campinas');
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cadastrar fornecedor').click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
  let lf = await linhasForn();
  check('cadastrar fornecedor -> aparece com cidade e 0 abastecimentos', lf.some((l) => l[0] === nomeForn && l[1] === 'Campinas' && l[3] === '0') && (await api('/fornecedores')).some((f) => f.nome === nomeForn), JSON.stringify(lf.find((l) => l[0] === nomeForn)));

  const comUso = lf.find((l) => Number(l[3]) > 0);
  await evalJs(`(async () => { [...document.querySelectorAll('.forn-row')].find(r => r.children[0]?.textContent.trim() === ${JSON.stringify(comUso[0])}).querySelector('button[title="Excluir fornecedor"]').click(); await new Promise(r => setTimeout(r, 1200)); })()`);
  check('excluir fornecedor com abastecimentos -> recusado com aviso', (await linhasForn()).some((l) => l[0] === comUso[0]) && (await texto()).includes('tem abastecimentos registrados'), comUso[0]);

  // abastecimentos no veículo de teste: km/L conferido contra a fórmula
  let erro = await abastecer(placa, '', '', '100', '1000');
  check('litros vazio bloqueado no form', erro.includes('Preencha litros'), erro);

  // fornecedor padrão do form é o primeiro da lista — garante que não é o de teste (vai ser excluído depois)
  erro = await abastecer(placa, iso(-3), '40', '250', '10000');
  let a = (await api('/abastecimentos')).find((x) => x.veiculo.placa === placa && x.hodometro === 10000);
  ls = await linhasAbast();
  check('1º abastecimento: sem anterior -> km/L — (null na API)', !erro && a && a.kmL === null && ls.some((l) => l[1] === placa && l[5] === '—'), erro);

  erro = await abastecer(placa, '', '40', '252', '10400');
  a = (await api('/abastecimentos')).find((x) => x.veiculo.placa === placa && x.hodometro === 10400);
  ls = await linhasAbast();
  const v1 = await api(`/veiculos/${veic.id}`);
  check('2º: (10400-10000)/40 = 10,0 km/L na API e na tela; veículo atualizado', a?.kmL === 10 && !a.anomalo && ls.some((l) => l[1] === placa && l[5] === '10,0') && v1.hodometro === 10400 && v1.kmL === 10, `kmL=${a?.kmL} hod=${v1.hodometro}`);

  await abastecer(placa, '', '50', '310', '10600');
  a = (await api('/abastecimentos')).find((x) => x.veiculo.placa === placa && x.hodometro === 10600);
  ls = await linhasAbast();
  let t = await texto();
  check('3º: 200/50 = 4,0 km/L < 80% da média -> anômalo (ícone + card)', a?.kmL === 4 && a.anomalo && ls.some((l) => l[1] === placa && l[5].includes('warning') && l[5].endsWith('4,0')) && t.includes(`Consumo anômalo — ${placa}`), `kmL=${a?.kmL} anom=${a?.anomalo}`);

  await abastecer(placa, iso(-10), '30', '190', '9000');
  const v2 = await api(`/veiculos/${veic.id}`);
  const retro = (await api('/abastecimentos')).find((x) => x.veiculo.placa === placa && x.hodometro === 9000);
  check('retroativo (hod 9000, 10 dias atrás) não faz o hodômetro do veículo voltar', retro && v2.hodometro === 10600 && v2.kmL === 4, `hod=${v2.hodometro}`);

  await goto(`${APP}/veiculos/${placa}`);
  t = await texto();
  check('detalhe do veículo mostra hodômetro e abastecimentos atualizados', t.includes('10.600') && (t.match(/Posto|Ipiranga|Shell|Alvorada|Petrobras/g) || []).length >= 1);

  await goto(`${APP}/combustivel`);
  await evalJs(`(async () => { [...document.querySelectorAll('.forn-row')].find(r => r.children[0]?.textContent.trim() === ${JSON.stringify(nomeForn)}).querySelector('button[title="Excluir fornecedor"]').click(); await new Promise(r => setTimeout(r, 1200)); })()`);
  check('excluir fornecedor sem uso -> some da tela e da API', !(await linhasForn()).some((l) => l[0] === nomeForn) && !(await api('/fornecedores')).some((f) => f.nome === nomeForn));
});
