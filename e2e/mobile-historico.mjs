// e2e: app mobile — histórico do motorista vindo da API (GET /vistorias/minhas) + fila local (Mobile #6). Ver e2e/README.md.
import { MOTORISTA, suite } from './lib.mjs';

await suite('Mobile: histórico do motorista (Mobile #6)', async ({ API, APP_MOBILE, send, evalJs, goto, url, texto, check, sleep }) => {
  const prefs = async (k) => JSON.parse((await evalJs(`localStorage.getItem('CapacitorStorage.${k}')`)) ?? 'null');
  const fila = async () => (await prefs('vetor.queue')) ?? [];
  const gravarFila = (itens) => evalJs(`localStorage.setItem('CapacitorStorage.vetor.queue', ${JSON.stringify(JSON.stringify(itens))})`);
  const bloquearApi = (sim) => send('Network.setBlockedURLs', { urls: sim ? [`${API}/*`] : [] });
  const reabrir = async (rota, ms) => { await goto(`${APP_MOBILE}${rota}`); await sleep(ms); };
  const req = async (path, body, token) => {
    const r = await fetch(`${API}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const tokenDe = async (login) => (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, senha: 'demo123' }) })).json()).accessToken;
  /** login do zero (localStorage limpo = app recém-instalado) */
  const entrar = async (usuario) => {
    await goto(`${APP_MOBILE}/login`);
    await evalJs('localStorage.clear()');
    await reabrir('/login', 1500);
    await evalJs(`(async () => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name=username]', ${JSON.stringify(usuario)}); set('input[name=password]', 'demo123');
      document.querySelector('button[type=submit]').click();
      await new Promise(r => setTimeout(r, 2500));
    })()`);
  };
  const sair = async () => {
    await goto(`${APP_MOBILE}/tabs/perfil`);
    await sleep(600);
    await evalJs(`(async () => {
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('sair')).click();
      await new Promise(r => setTimeout(r, 800));
      [...document.querySelectorAll('ion-alert button')].find(b => b.textContent.trim().toLowerCase() === 'sair')?.click();
      await new Promise(r => setTimeout(r, 600));
    })()`);
  };
  /** linhas da aba histórico: título de cada uma ("14:05 · do carro RTX-4B21") */
  const linhasHistorico = async () => {
    await reabrir('/tabs/historico', 2500);
    return evalJs(`[...document.querySelectorAll('app-history .list-row__title')].map(e => e.textContent.trim())`);
  };
  /** horário como o app formata (mesmo fuso do navegador de teste) */
  const hora = (iso) => evalJs(`new Date(${JSON.stringify(iso)}).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })`);
  const lataria = [{ stepId: 'lataria', label: 'avaria 1', avaliacao: 'ATENCAO', observacao: 'risco E2E histórico' }];

  await send('Network.enable');
  const motTok = await tokenDe(MOTORISTA.login);
  const veiculoId = (await req('/motorista/veiculo-do-dia', null, motTok)).json.id;

  try {
    // vistoria "feita ontem às 07:10 em outro celular" (ou antes de reinstalar o app)
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); ontem.setHours(7, 10, 0, 0);
    const criada = await req('/vistorias', { clienteId: 'e2e-hist-ontem', veiculoId, iniciadoEm: new Date(ontem.getTime() - 15 * 60_000).toISOString(), concluidoEm: ontem.toISOString(), itens: lataria }, motTok);
    check('API grava concluidoEm mandado pelo app (vistoria offline chega depois)', criada.status === 201 && new Date(criada.json.concluidoEm).getTime() === ontem.getTime(), `${criada.status} ${criada.json?.concluidoEm}`);
    const futuro = await req('/vistorias', { clienteId: 'e2e-hist-futuro', veiculoId, concluidoEm: new Date(Date.now() + 86_400_000).toISOString(), itens: lataria }, motTok);
    check('concluidoEm no futuro (relógio do celular adiantado) vira "agora"', futuro.status === 201 && new Date(futuro.json.concluidoEm).getTime() <= Date.now());

    // 1) app recém-instalado: fila vazia, histórico vem do servidor
    await entrar(MOTORISTA.login);
    const minhas = (await req('/vistorias/minhas', null, motTok)).json;
    let linhas = await linhasHistorico();
    const t1 = await texto();
    check('app recém-instalado: aba histórico mostra todas as vistorias do servidor (fila vazia)', (await fila()).length === 0 && linhas.length === minhas.length && minhas.length >= 2, `linhas=${linhas.length} api=${minhas.length}`);
    check('...com o horário em que foi concluída, agrupada em "ontem"', t1.includes('ontem') && linhas.includes(`${await hora(ontem.toISOString())} · do carro RTX-4B21`), linhas.slice(0, 4).join(' | '));
    const cache = await prefs('vetor.historico');
    check('histórico fica em cache no Preferences, com o dono', cache?.owner === MOTORISTA.login && cache.itens.length === minhas.length);
    await reabrir('/tabs', 2000);
    const home = await evalJs(`document.querySelectorAll('app-home .list-row').length`);
    check('home mostra as 4 mais recentes do mesmo histórico', home === Math.min(4, minhas.length), `home=${home}`);

    // 2) reabrir sem internet: histórico do cache
    await bloquearApi(true);
    linhas = await linhasHistorico();
    check('reabrir SEM internet: histórico continua lá (cache)', linhas.length === minhas.length, `linhas=${linhas.length}`);

    // 3) sem internet: vistoria nova na fila aparece junto, sem sumir com as do servidor
    const itemFila = (id, status) => ({
      id, vehicleId: veiculoId, vehiclePlate: 'RTX-4B21', vehicleType: 'carro', owner: MOTORISTA.login,
      startedAt: new Date().toISOString(), createdAt: new Date().toISOString(), hasCriticalAlert: false, hasWarnAlert: true, status,
      steps: [{ id: 'lataria', label: 'avarias na lataria', icon: 'car_crash', photoRequirement: 'on-issue', noteOnIssue: true, notePlaceholder: '',
        subItems: [{ label: 'avaria 1', rating: 'atencao', photoDataUrl: null, note: 'risco E2E histórico' }] }],
    });
    await gravarFila([itemFila('e2e-hist-local', 'queued')]);
    linhas = await linhasHistorico();
    const t3 = await texto();
    check('offline: vistoria da fila ("guardada no celular") + as do servidor', linhas.length === minhas.length + 1 && t3.includes('guardada no celular'), `linhas=${linhas.length}`);

    // 4) internet volta: a da fila é enviada, aparece uma vez só e sai da fila quando o servidor a confirma
    await bloquearApi(false);
    await reabrir('/tabs', 4000);
    // pode já ter saído da fila (enviada e confirmada pelo servidor na mesma abertura)
    const enviada = (await fila()).find((i) => i.id === 'e2e-hist-local');
    linhas = await linhasHistorico(); // reabrir de novo: GET /vistorias/minhas já traz a enviada
    const minhas4 = (await req('/vistorias/minhas', null, motTok)).json;
    const daFila = minhas4.find((v) => v.clienteId === 'e2e-hist-local');
    check('internet volta: vistoria da fila enviada e mostrada uma vez só', (!enviada || enviada.status === 'sent') && !!daFila && linhas.length === minhas4.length && minhas4.length === minhas.length + 1, `status=${enviada?.status} linhas=${linhas.length} api=${minhas4.length}`);
    check('...e sai da fila local depois que o servidor a lista (a fila não cresce pra sempre)', !(await fila()).some((i) => i.id === 'e2e-hist-local'), JSON.stringify((await fila()).map((i) => i.id)));

    // 5) resposta perdida: a fila ainda acha que não enviou, mas o servidor já tem (mesmo clienteId) -> uma linha só
    await gravarFila([itemFila('e2e-hist-ontem', 'error')]);
    linhas = await linhasHistorico();
    const t5 = await texto();
    check('item da fila que o servidor já tem (resposta perdida): uma linha só, a da fila', linhas.length === minhas4.length && t5.includes('falhou ao enviar'), `linhas=${linhas.length}`);
    await gravarFila([]);

    // 6) outro motorista no mesmo celular não vê o histórico do João
    await reabrir('/tabs', 1000);
    await sair();
    const cacheDepoisDeSair = await prefs('vetor.historico');
    await entrar('paulo.cezar');
    const doPaulo = (await req('/vistorias/minhas', null, await tokenDe('paulo.cezar'))).json;
    linhas = await linhasHistorico();
    check('sair apaga o cache; outro motorista vê só o histórico dele', cacheDepoisDeSair === null && linhas.length === doPaulo.length && (await prefs('vetor.historico'))?.owner === 'paulo.cezar' && (await url()) === '/tabs/historico', `cache=${JSON.stringify(cacheDepoisDeSair)?.slice(0, 60)} owner=${(await prefs('vetor.historico'))?.owner} url=${await url()} linhas=${linhas.length} api=${doPaulo.length}`);
  } finally {
    await bloquearApi(false).catch(() => {});
    // vistorias de teste (clienteId e2e-%) são apagadas pelo limparDadosDeTeste
  }
});
