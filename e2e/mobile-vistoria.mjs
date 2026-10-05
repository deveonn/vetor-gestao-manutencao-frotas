// e2e: app mobile — envio da vistoria (POST /vistorias) pela fila offline (Mobile #5). Ver e2e/README.md.
import { ADMIN, MOTORISTA, suite } from './lib.mjs';

await suite('Mobile: envio da vistoria (Mobile #5)', async ({ APP, API, APP_MOBILE, send, evalJs, goto, url, texto, loginAdmin, check, sleep, sql }) => {
  const fila = () => evalJs(`JSON.parse(localStorage.getItem('CapacitorStorage.vetor.queue') || '[]')`);
  const gravarFila = (itens) => evalJs(`localStorage.setItem('CapacitorStorage.vetor.queue', ${JSON.stringify(JSON.stringify(itens))})`);
  const bloquearApi = (sim) => send('Network.setBlockedURLs', { urls: sim ? [`${API}/*`] : [] });
  const reabrir = async (rota, ms) => { await goto(`${APP_MOBILE}${rota}`); await sleep(ms); };
  const post = async (path, body, token) => {
    const r = await fetch(`${API}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const tokenDe = async (login, senha = 'demo123') => (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, senha }) })).json()).accessToken;
  const adminTok = await tokenDe(ADMIN.login, ADMIN.senha);
  const vistoriasApi = async () => (await post('/vistorias', null, adminTok)).json;
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
  /** Faz a vistoria inteira pelas telas: "óleo e água" = atenção com descrição, o resto "está bom". */
  const fazerVistoria = async () => {
    await goto(`${APP_MOBILE}/confirmar-veiculo`);
    await sleep(800);
    await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('sim, é')).click()`);
    for (let passo = 0; passo < 60; passo++) {
      await sleep(450);
      const rota = await url();
      if (rota === '/vistoria/confirmacao') return true;
      const acao = await evalJs(`(() => {
        const modal = document.querySelector('ion-modal');
        if (modal) { modal.querySelector('.btn-primary')?.click(); return 'modal'; }
        const p = location.pathname;
        if (p.startsWith('/vistoria/avaliar/')) {
          const step = p.split('/')[3];
          const opcao = step === 'oleo-agua' ? 'precisa de atenção' : 'está bom';
          [...document.querySelectorAll('.rate-option')].find(b => b.textContent.includes(opcao)).click();
          return 'avaliar:' + step;
        }
        if (p === '/vistoria/revisao') { [...document.querySelectorAll('button')].find(b => b.textContent.includes('finalizar')).click(); return 'finalizar'; }
        if (p === '/vistoria') { document.querySelector('.btn-primary').click(); return 'continuar'; }
        return 'nada:' + p;
      })()`);
      if (acao.startsWith('avaliar:')) {
        await sleep(200);
        if (acao === 'avaliar:oleo-agua') {
          await evalJs(`(() => { const el = document.querySelector('#issue-note'); el.value = 'nível baixo E2E'; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
          await sleep(150);
        }
        await evalJs(`document.querySelector('.rate__footer .btn-primary').click()`);
      }
    }
    return false;
  };
  const clienteIdsCriados = new Set();
  await send('Network.enable');

  try {
    // 1) vistoria completa pelas telas, com rede
    const antes = await vistoriasApi();
    await entrar(MOTORISTA.login);
    const chegou = await fazerVistoria();
    await sleep(3000);
    let q = await fila();
    q.forEach((i) => clienteIdsCriados.add(i.id));
    const enviada = q[0];
    let lista = await vistoriasApi();
    const noServidor = lista.find((v) => v.clienteId === enviada?.id);
    const oleo = noServidor?.itens.find((i) => i.stepId === 'oleo-agua');
    check('vistoria feita pelas telas chega na API (POST /vistorias) com o clienteId da fila', chegou && enviada?.status === 'sent' && !!noServidor && enviada.serverId === noServidor.id && lista.length === antes.length + 1, `status=${enviada?.status}`);
    check('conteúdo: motorista e veículo certos, 4 pneus + demais itens, óleo com ATENCAO e a descrição', noServidor?.motorista.nome === MOTORISTA.nome && noServidor.veiculo.placa === 'RTX-4B21' && noServidor.itens.filter((i) => i.stepId === 'pneus').length === 4 && oleo?.avaliacao === 'ATENCAO' && oleo?.observacao === 'nível baixo E2E' && noServidor.temAlertaAtencao && !noServidor.temAlertaCritico);
    check('depois de enviada, a fila não guarda mais foto em base64', enviada.steps.every((s) => s.subItems.every((x) => !x.photoDataUrl)));

    // 2) vistoria feita sem internet fica na fila e vai quando a API volta — sem duplicar
    await bloquearApi(true);
    await fazerVistoria();
    await sleep(1500);
    q = await fila();
    q.forEach((i) => clienteIdsCriados.add(i.id));
    const offline = q[0];
    const naFila = offline.status === 'queued';
    await entrarPerfilESair();
    const bloqueado = (await texto()).includes('ainda não dá para sair') && (await url()) === '/tabs/perfil';
    await evalJs(`[...document.querySelectorAll('ion-alert button')].find(b => b.textContent.includes('entendi'))?.click()`);
    check('sem internet: vistoria fica "queued" e sair da conta é bloqueado com aviso', naFila && bloqueado);
    await bloquearApi(false);
    await reabrir('/tabs', 4000);
    lista = await vistoriasApi();
    check('API volta: a vistoria offline é enviada (uma vez só)', (await fila()).find((i) => i.id === offline.id)?.status === 'sent' && lista.filter((v) => v.clienteId === offline.id).length === 1);

    // 3) idempotência: reenviar o mesmo clienteId devolve a mesma vistoria
    const motTok = await tokenDe(MOTORISTA.login);
    const corpo = { clienteId: offline.id, veiculoId: offline.vehicleId, itens: [{ stepId: 'freios', label: 'freios', avaliacao: 'OK' }] };
    const re = await post('/vistorias', corpo, motTok);
    const serverIdOffline = (await fila()).find((i) => i.id === offline.id).serverId;
    check('reenvio com o mesmo clienteId -> mesma vistoria, nada duplicado', re.status === 201 && re.json.id === serverIdOffline && (await vistoriasApi()).length === lista.length, `status=${re.status} ${re.json?.id} vs ${serverIdOffline}`);

    // 4) midiaId que não existe -> 400 na API e "error" na fila
    const ruim = await post('/vistorias', { clienteId: 'e2e-midia', veiculoId: offline.vehicleId, itens: [{ stepId: 'lataria', label: 'avarias na lataria', avaliacao: 'ATENCAO', midiaId: 'nao-existe' }] }, motTok);
    check('midiaId de foto inexistente -> 400', ruim.status === 400, `status=${ruim.status}`);

    // 5) item de outro motorista no mesmo celular: não é enviado nem aparece; e não impede este motorista de sair
    const alheio = { ...offline, id: 'e2e-alheio', owner: 'outro.motorista', status: 'queued', serverId: null };
    await gravarFila([alheio, ...(await fila())]);
    await reabrir('/tabs/historico', 3000);
    const alheioDepois = (await fila()).find((i) => i.id === 'e2e-alheio');
    const lista5 = await vistoriasApi();
    await entrarPerfilESair();
    await sleep(1500);
    check('vistoria de outro motorista fica na fila (não vai com o token errado) e não bloqueia a saída', alheioDepois.status === 'queued' && !lista5.some((v) => v.clienteId === 'e2e-alheio') && (await url()) === '/login', `status=${alheioDepois.status} url=${await url()}`);

    // 6) caminhão: 6 posições de pneu do app até o diagrama do painel web
    const placa = 'TST-' + Math.floor(1000 + Math.random() * 9000);
    const cam = (await post('/veiculos', { placa, tipo: 'CAMINHAO_LEVE' }, adminTok)).json;
    check('caminhão novo nasce com 6 posições de pneu (traseiro duplo)', cam.pneus.length === 6 && cam.pneus.some((p) => p.posicao === 'traseiro esquerdo externo'), cam.pneus.map((p) => p.posicao).join(', '));
    const paulo = (await post('/motoristas', null, adminTok)).json.find((m) => m.nome === 'Paulo Cezar');
    await post(`/veiculos/${cam.id}/vinculos`, { motoristaId: paulo.id }, adminTok);
    await entrar('paulo.cezar');
    const posicoes = ['dianteiro esquerdo', 'dianteiro direito', 'traseiro esquerdo interno', 'traseiro esquerdo externo', 'traseiro direito interno', 'traseiro direito externo'];
    await gravarFila([{
      id: 'e2e-caminhao', vehicleId: cam.id, vehiclePlate: placa, vehicleType: 'caminhao', owner: 'paulo.cezar', startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), hasCriticalAlert: true, hasWarnAlert: false, status: 'queued',
      steps: [{ id: 'pneus', label: 'pneus', icon: 'tire_repair', photoRequirement: 'none', noteOnIssue: true, notePlaceholder: '',
        subItems: posicoes.map((label) => ({ label, rating: label === 'traseiro esquerdo externo' ? 'trocar' : 'ok', photoDataUrl: null, note: label === 'traseiro esquerdo externo' ? 'banda rasgada E2E' : null })) }],
    }]);
    await reabrir('/tabs', 3500);
    const camDepois = (await post(`/veiculos/${cam.id}`, null, adminTok)).json;
    const sinal = (await post('/pneus/sinalizados', null, adminTok)).json.find((p) => p.veiculo.placa === placa);
    check('vistoria do caminhão marca o "traseiro esquerdo externo" como crítico, sem criar posição nova', camDepois.pneus.length === 6 && camDepois.pneus.find((p) => p.posicao === 'traseiro esquerdo externo').severidade === 'CRITICO' && sinal?.posicao === 'traseiro esquerdo externo' && sinal.observacao === 'banda rasgada E2E');
    await loginAdmin();
    await goto(`${APP}/veiculos`);
    const dots = await evalJs(`[...document.querySelectorAll('.row')].find(r => r.textContent.includes(${JSON.stringify(placa)}))?.innerHTML ?? ''`);
    check('painel web: diagrama de 4 pontos mostra o traseiro esquerdo do caminhão em vermelho', dots.includes('var(--crit)'));
  } finally {
    await bloquearApi(false).catch(() => {});
    const ids = [...clienteIdsCriados].filter((id) => !id.startsWith('e2e-'));
    if (ids.length) sql(`DELETE FROM vistorias WHERE "clienteId" IN (${ids.map((id) => `'${id}'`).join(',')});`);
    // o fluxo pelas telas regrava os pneus do RTX-4B21 (todos "está bom", igual ao seed) — nada a restaurar
  }

  async function entrarPerfilESair() {
    await goto(`${APP_MOBILE}/tabs/perfil`);
    await sleep(600);
    await evalJs(`(async () => {
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('sair')).click();
      await new Promise(r => setTimeout(r, 800));
      [...document.querySelectorAll('ion-alert button')].find(b => b.textContent.trim().toLowerCase() === 'sair')?.click();
      await new Promise(r => setTimeout(r, 600));
    })()`);
  }
});
