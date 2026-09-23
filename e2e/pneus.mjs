// e2e: Pneus e vistorias (Web #9). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Pneus e vistorias (Web #9)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const cardsPneus = () => evalJs(`[...document.querySelectorAll('.flagged-grid > div')].map(c => c.innerText.split('\\n').map(x => x.trim()).filter(Boolean))`);
  const cardsVist = () => evalJs(`[...document.querySelectorAll('.insp-grid > div')].map(c => c.innerText.split('\\n').map(x => x.trim()).filter(Boolean))`);
  const criadas = [];
  let pneusAntes = null, veicMot = null;

  try {
    await loginAdmin();

    const s0 = await api('/pneus/sinalizados');
    const v0 = await api('/vistorias');
    await goto(`${APP}/pneus`);
    let cp = await cardsPneus();
    const posCap = (p) => p.charAt(0).toUpperCase() + p.slice(1);
    check('pneus sinalizados = API (placa, posição, severidade, observação, ordem)', cp.length === s0.length && s0.every((p, i) => cp[i].join('|').includes(p.veiculo.placa) && cp[i].includes(posCap(p.posicao)) && cp[i].join('|').includes(p.severidade === 'CRITICO' ? 'trocar agora' : 'monitorar') && cp[i].includes(p.observacao ?? '—')), JSON.stringify(cp.map((c) => c.slice(1, 4))));
    const semVist = s0.find((p) => !p.vistoriaEm);
    check('pneu sem vistoria de origem mostra "—" na data', !semVist || cp.find((c) => c.join('|').includes(semVist.veiculo.placa) && c.includes(posCap(semVist.posicao))).includes('vistoria de —'));

    let cv = await cardsVist();
    check('vistorias = API (placa, motorista, ordem)', cv.length === v0.length && v0.every((vi, i) => cv[i][0] === vi.veiculo.placa && cv[i].includes(`por ${vi.motorista.nome}`)), `${cv.length}/${v0.length}`);
    const sqp = cv.find((c) => c[0] === 'SQP-7D45').join('|');
    check('etapas agregadas: Pneus crítico, Óleo e água atenção com observação, resto ok', sqp.includes('Pneus|error|traseiro esquerdo sinalizado') && sqp.includes('Óleo e água|warning|nível baixo') && sqp.includes('Freios|check_circle|ok'), sqp);

    // vistoria enviada pelo motorista (como o app mobile fará) aparece no painel
    const login = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'joao.prates', senha: 'demo123' }) })).json();
    veicMot = await api('/motorista/veiculo-do-dia', 'GET', null, login.accessToken);
    pneusAntes = veicMot.pneus.map((p) => ({ posicao: p.posicao, severidade: p.severidade, observacao: p.observacao }));
    const posicoes = ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo', 'traseiro direito'];
    const itensBase = (pneu) => [
      ...posicoes.map((pos) => ({ stepId: 'pneus', label: pos, avaliacao: pos === 'traseiro direito' ? pneu : 'OK', ...(pos === 'traseiro direito' && pneu !== 'OK' ? { observacao: 'corte lateral E2E' } : {}) })),
      { stepId: 'oleo-agua', label: 'óleo e água', avaliacao: 'OK' },
      { stepId: 'luzes-setas', label: 'luzes e setas', avaliacao: 'OK' },
      { stepId: 'freios', label: 'freios', avaliacao: 'OK' },
      { stepId: 'lataria', label: 'avarias na lataria', avaliacao: 'OK' },
    ];
    const vis1 = await api('/vistorias', 'POST', { veiculoId: veicMot.id, itens: itensBase('TROCAR') }, login.accessToken);
    criadas.push(vis1.id);
    await goto(`${APP}/pneus`);
    cp = await cardsPneus(); cv = await cardsVist();
    const novoPneu = cp.find((c) => c.join('|').includes(veicMot.placa) && c.includes('Traseiro direito'));
    check('vistoria do motorista -> pneu crítico aparece primeiro com obs e data de hoje', novoPneu && cp.indexOf(novoPneu) === 0 && novoPneu.includes('corte lateral E2E') && novoPneu.join('|').includes('trocar agora'), JSON.stringify(novoPneu));
    check('...e a vistoria aparece no topo, Pneus crítico com observação', cv[0][0] === veicMot.placa && cv[0].join('|').includes('Pneus|error|corte lateral E2E') && cv[0].includes('por João Prates'), JSON.stringify(cv[0]));

    await goto(`${APP}/veiculos`);
    const dots = await evalJs(`[...document.querySelectorAll('.row')].find(r => r.textContent.includes(${JSON.stringify(veicMot.placa)})).innerHTML.includes('var(--crit)')`);
    check('lista de veículos mostra o pneu crítico no diagrama', dots === true);

    await goto(`${APP}/veiculos/${veicMot.placa}`);
    check('detalhe do veículo lista a vistoria nova', (await texto()).includes('João Prates'));

    const vis2 = await api('/vistorias', 'POST', { veiculoId: veicMot.id, itens: itensBase('OK') }, login.accessToken);
    criadas.push(vis2.id);
    await goto(`${APP}/pneus`);
    cp = await cardsPneus();
    const pn = (await api(`/veiculos/${veicMot.id}`)).pneus.find((p) => p.posicao === 'traseiro direito');
    check('nova vistoria OK tira o pneu da lista e limpa a observação antiga', !cp.some((c) => c.join('|').includes(veicMot.placa) && c.includes('Traseiro direito')) && pn.severidade === 'OK' && pn.observacao === null, JSON.stringify(pn));
  } finally {
    if (criadas.length) sql(`DELETE FROM vistorias WHERE id IN (${criadas.map((id) => `'${id}'`).join(',')});`);
    if (pneusAntes) for (const p of pneusAntes) sql(`UPDATE pneu_posicoes SET severidade = '${p.severidade}', observacao = ${p.observacao == null ? 'NULL' : `'${p.observacao.replace(/'/g, "''")}'`} WHERE "veiculoId" = '${veicMot.id}' AND posicao = '${p.posicao}';`);
  }
});
