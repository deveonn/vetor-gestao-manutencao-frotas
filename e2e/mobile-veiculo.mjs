// e2e: app mobile — veículo do dia (Mobile #3). Pré-requisitos e como rodar: e2e/README.md.
import { ADMIN, MOTORISTA, suite } from './lib.mjs';

await suite('Mobile: veículo do dia (Mobile #3)', async ({ API, APP_MOBILE, send, evalJs, goto, url, texto, check, sleep, sql }) => {
  const prefs = (k) => evalJs(`JSON.parse(localStorage.getItem('CapacitorStorage.${k}'))`);
  const abrirApp = async (rota = '/') => { await goto(`${APP_MOBILE}${rota}`); await sleep(1500); };
  const entrar = async (usuario, senha = 'demo123') => {
    await goto(`${APP_MOBILE}/login`);
    await evalJs('localStorage.clear()');
    await abrirApp('/login');
    await evalJs(`(async () => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name=username]', ${JSON.stringify(usuario)}); set('input[name=password]', ${JSON.stringify(senha)});
      document.querySelector('button[type=submit]').click();
      await new Promise(r => setTimeout(r, 2500));
    })()`);
  };
  const clicar = (txt) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(txt)})).click(); await new Promise(r => setTimeout(r, 1500)); })()`);
  const bloquearApi = (sim) => send('Network.setBlockedURLs', { urls: sim ? [`${API}/*`] : [] });
  const adminToken = (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN) })).json()).accessToken;
  const admin = async (path, method = 'GET', body) => {
    const r = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: body ? JSON.stringify(body) : undefined });
    return r.status === 204 ? null : r.json();
  };
  await send('Network.enable');

  const veiculos = await admin('/veiculos');
  const doJoao = veiculos.find((v) => v.motoristaAtual?.nome === MOTORISTA.nome);
  const kmFmt = (n) => n.toLocaleString('pt-BR');

  await entrar(MOTORISTA.login);
  let t = await texto();
  let cache = await prefs('vetor.veiculo-do-dia');
  check('após login: cabeçalho com placa e modelo (minúsculo) do veículo do dia, e cache no Preferences', t.includes(doJoao.placa) && t.includes(doJoao.modelo.toLowerCase()) && cache?.id === doJoao.id && cache?.type === 'carro', `${doJoao.placa} ${doJoao.modelo}`);

  await goto(`${APP_MOBILE}/confirmar-veiculo`);
  await sleep(500);
  t = await texto();
  check('confirmar veículo: "este carro" (UTILITARIO), placa, modelo sem cor e km da API', t.includes('você está com este carro?') && t.includes(doJoao.placa) && t.includes(doJoao.modelo.toLowerCase()) && !t.includes(`${doJoao.modelo.toLowerCase()} ·`) && t.includes(`km atual: ${kmFmt(doJoao.hodometro)}`) && !t.includes('RQF-2318'), t.slice(0, 200));

  // reabrir sem internet: veículo vem do cache e a vistoria começa
  await bloquearApi(true);
  await abrirApp('/tabs');
  t = await texto();
  // o cache tem que sobreviver à reabertura (antes o app apagava enquanto restaurava a sessão)
  const offlineHeader = t.includes(doJoao.placa) && (await prefs('vetor.veiculo-do-dia'))?.id === doJoao.id;
  await goto(`${APP_MOBILE}/confirmar-veiculo`);
  await sleep(500);
  await clicar('sim, é');
  const rotaVistoria = await url();
  await bloquearApi(false);
  check('reabrir SEM internet: veículo do cache e "sim, é esse" abre a vistoria', offlineHeader && rotaVistoria === '/vistoria', `header=${offlineHeader} rota=${rotaVistoria}`);

  // motorista sem veículo, gestor vincula durante o teste, "verificar de novo" busca
  const paulo = (await admin('/motoristas')).find((m) => m.nome === 'Paulo Cezar');
  const livre = veiculos.find((v) => !v.motoristaAtual && v.tipo === 'CAMINHAO_LEVE');
  let vinculo = null;
  try {
    await entrar('paulo.cezar');
    t = await texto();
    check('motorista sem veículo: home explica e oferece "verificar de novo"', t.includes('nenhum veículo vinculado a você hoje') && t.includes('verificar de novo') && (await prefs('vetor.veiculo-do-dia')) === null);

    vinculo = await admin(`/veiculos/${livre.id}/vinculos`, 'POST', { motoristaId: paulo.id });
    await clicar('verificar de novo');
    t = await texto();
    cache = await prefs('vetor.veiculo-do-dia');
    check('gestor vincula -> "verificar de novo" traz o veículo (CAMINHAO_LEVE -> caminhão)', t.includes(livre.placa) && cache?.type === 'caminhao' && !t.includes('nenhum veículo vinculado'), `${livre.placa} ${cache?.type}`);
    await goto(`${APP_MOBILE}/confirmar-veiculo`);
    await sleep(500);
    check('...e o confirmar veículo pergunta "este caminhão?"', (await texto()).includes('você está com este caminhão?'));

    // desvincula (volta ao estado do seed) -> API responde 404 -> cache limpo
    sql(`DELETE FROM vinculos_motorista_veiculo WHERE id = '${vinculo.id}'; UPDATE veiculos SET "motoristaAtualId" = NULL WHERE id = '${livre.id}';`);
    vinculo = null;
    await abrirApp('/tabs');
    t = await texto();
    check('veículo desvinculado -> 404 limpa o cache e volta o estado vazio', t.includes('nenhum veículo vinculado a você hoje') && (await prefs('vetor.veiculo-do-dia')) === null);
  } finally {
    if (vinculo) sql(`DELETE FROM vinculos_motorista_veiculo WHERE id = '${vinculo.id}'; UPDATE veiculos SET "motoristaAtualId" = NULL WHERE id = '${livre.id}';`);
  }

  // van: tipo VAN_CARGA
  await entrar('carla.nunes');
  await goto(`${APP_MOBILE}/confirmar-veiculo`);
  await sleep(500);
  check('VAN_CARGA -> "esta van?"', (await texto()).includes('você está com esta van?'));

  // sair esquece o veículo do motorista anterior
  await goto(`${APP_MOBILE}/tabs/perfil`);
  await sleep(500);
  await evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.includes('sair')).click();
    await new Promise(r => setTimeout(r, 800));
    [...document.querySelectorAll('ion-alert button')].find(b => b.textContent.trim().toLowerCase() === 'sair').click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
  check('sair limpa o cache do veículo do dia', (await url()) === '/login' && (await prefs('vetor.veiculo-do-dia')) === null);

  // foto do veículo cadastrada pelo gestor aparece no app; sem internet volta pro desenho
  const form = new FormData();
  form.append('arquivo', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')], { type: 'image/png' }), 'foto.png');
  await fetch(`${API}/veiculos/${doJoao.id}/foto`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: form });
  try {
    await entrar(MOTORISTA.login);
    await abrirApp('/confirmar-veiculo');
    const foto = await evalJs(`(() => { const i = document.querySelector('.cv__photo img'); return i ? i.complete && i.naturalWidth > 0 : false; })()`);
    await abrirApp('/tabs');
    const noCabecalho = await evalJs(`(() => { const i = document.querySelector('.tabs-header__photo img'); return i ? i.complete && i.naturalWidth > 0 : false; })()`);
    check('foto do veículo cadastrada no painel aparece no "você está com este carro?" e no cabeçalho do app', foto && noCabecalho, `confirmar=${foto} cabeçalho=${noCabecalho}`);
    await send('Network.setBlockedURLs', { urls: [`${API}/*`, `${API.replace(/\/api$/, '')}/uploads/*`] });
    await abrirApp('/confirmar-veiculo');
    await sleep(800);
    const off = await evalJs(`({ img: !!document.querySelector('.cv__photo img'), desenho: !!document.querySelector('.cv__photo .ms'), placa: document.body.innerText.includes(${JSON.stringify(doJoao.placa)}) })`);
    check('sem internet: a foto não carrega e o app volta pro desenho do tipo (placa continua do cache)', !off.img && off.desenho && off.placa, JSON.stringify(off));
  } finally {
    await bloquearApi(false);
    await admin(`/veiculos/${doJoao.id}/foto`, 'DELETE');
  }
});
