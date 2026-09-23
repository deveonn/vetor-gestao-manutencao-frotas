// e2e: app mobile — login real e sessão offline-first (Mobile #2). Pré-requisitos e como rodar: e2e/README.md.
import { MOTORISTA, suite } from './lib.mjs';

await suite('Mobile: login e sessão (Mobile #2)', async ({ API, APP_MOBILE, send, evalJs, goto, url, texto, check, sleep }) => {
  const prefs = () => evalJs(`({ tokens: JSON.parse(localStorage.getItem('CapacitorStorage.vetor.tokens')), session: JSON.parse(localStorage.getItem('CapacitorStorage.vetor.session')) })`);
  /** Abre o app do zero (splash ~1,3 s) e espera assentar numa rota. */
  const abrirApp = async () => { await goto(`${APP_MOBILE}/`); await sleep(1500); };
  const entrar = (usuario, senha) => evalJs(`(async () => {
    const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('input[name=username]', ${JSON.stringify(usuario)}); set('input[name=password]', ${JSON.stringify(senha)});
    await new Promise(r => setTimeout(r, 100));
    document.querySelector('button[type=submit]').click();
    await new Promise(r => setTimeout(r, 1800));
    return document.querySelector('.field__error')?.textContent.trim() ?? '';
  })()`);
  const bloquearApi = (sim) => send('Network.setBlockedURLs', { urls: sim ? [`${API}/*`] : [] });
  await send('Network.enable');

  await goto(`${APP_MOBILE}/login`);
  await evalJs('localStorage.clear()');
  await abrirApp();
  check('sem sessão: splash leva pro /login', (await url()) === '/login');

  let erro = await entrar(MOTORISTA.login, 'errada');
  check('senha errada -> "usuário ou senha inválidos."', erro === 'usuário ou senha inválidos.' && (await url()) === '/login', erro);

  erro = await entrar('rui@transportesalmeida.com.br', 'demo123');
  check('conta de gestor é barrada e não guarda token', erro.startsWith('este app é para motoristas') && (await prefs()).tokens === null, erro);

  await bloquearApi(true);
  erro = await entrar(MOTORISTA.login, MOTORISTA.senha);
  await bloquearApi(false);
  check('sem internet e sem sessão -> explica que o 1º acesso precisa de conexão', erro.startsWith('sem internet') && (await url()) === '/login', erro);

  erro = await entrar(MOTORISTA.login, MOTORISTA.senha);
  let p = await prefs();
  check('login do motorista do seed -> /tabs, tokens e sessão no Preferences', (await url()) === '/tabs' && !!p.tokens?.refreshToken && p.session?.username === MOTORISTA.login && p.session?.nome === MOTORISTA.nome && p.session?.displayName === 'joão', `${erro} ${JSON.stringify(p.session)}`);
  const primeiroRefresh = p.tokens.refreshToken;

  await abrirApp();
  check('reabrir o app -> volta direto pra /tabs', (await url()) === '/tabs');
  await goto(`${APP_MOBILE}/tabs/perfil`);
  await sleep(500);
  let t = await texto();
  check('perfil mostra nome completo e @usuário da API', t.includes(MOTORISTA.nome) && t.includes(`@${MOTORISTA.login}`));

  // reabrir sem internet: sessão salva vale, /auth/me falha em silêncio
  await bloquearApi(true);
  await abrirApp();
  await sleep(1000);
  p = await prefs();
  await bloquearApi(false);
  check('reabrir SEM internet -> continua logado, tokens intactos', (await url()) === '/tabs' && p.tokens?.refreshToken === primeiroRefresh && p.session?.username === MOTORISTA.login);

  // access vencido: /auth/me no boot renova sozinho
  await evalJs(`localStorage.setItem('CapacitorStorage.vetor.tokens', JSON.stringify({ ...JSON.parse(localStorage.getItem('CapacitorStorage.vetor.tokens')), accessToken: 'lixo' }))`);
  await abrirApp();
  await sleep(1000);
  p = await prefs();
  check('reabrir com access vencido -> renova no boot e segue logado', (await url()) === '/tabs' && p.tokens.accessToken !== 'lixo' && p.tokens.refreshToken !== primeiroRefresh);

  // sessão revogada no servidor (refresh já usado): ao reabrir com rede, cai pro login
  await evalJs(`localStorage.setItem('CapacitorStorage.vetor.tokens', JSON.stringify({ accessToken: 'lixo', refreshToken: ${JSON.stringify(primeiroRefresh)} }))`);
  await abrirApp();
  await sleep(1500);
  p = await prefs();
  check('refresh recusado pelo servidor ao reabrir -> sessão encerrada, /login', (await url()) === '/login' && p.tokens === null && p.session === null, `url=${await url()}`);

  // sessão da época do login simulado (sem token) não vale mais
  await evalJs(`localStorage.clear(); localStorage.setItem('CapacitorStorage.vetor.session', JSON.stringify({ username: 'qualquer', displayName: 'qualquer', loginAt: '2026-01-01' }))`);
  await abrirApp();
  check('sessão antiga do mock (sem token) é descartada -> /login', (await url()) === '/login' && (await prefs()).session === null);

  // logout pelo perfil revoga o refresh no servidor
  await entrar(MOTORISTA.login, MOTORISTA.senha);
  const antesSair = (await prefs()).tokens.refreshToken;
  await goto(`${APP_MOBILE}/tabs/perfil`);
  await sleep(500);
  await evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.includes('sair')).click();
    await new Promise(r => setTimeout(r, 800));
    [...document.querySelectorAll('ion-alert button')].find(b => b.textContent.trim().toLowerCase() === 'sair').click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
  p = await prefs();
  const revogado = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: antesSair }) });
  check('sair pelo perfil -> /login, Preferences limpo, refresh revogado no servidor', (await url()) === '/login' && p.tokens === null && p.session === null && revogado.status === 401, `url=${await url()} refresh=${revogado.status}`);
});
