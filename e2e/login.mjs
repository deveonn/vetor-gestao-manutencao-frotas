// e2e: Login e sessão (Web #2). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Login e sessão (Web #2)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  await goto(`${APP}/login`);
  await evalJs('localStorage.clear()');
  await goto(`${APP}/painel`);
  check('sem sessão, /painel redireciona pra /login', (await url()) === '/login');

  let alerta = await typeLogin('rui@transportesalmeida.com.br', 'errada');
  check('senha errada mostra credencial inválida', alerta.includes('Credenciais inválidas') && (await url()) === '/login', alerta);

  alerta = await typeLogin('joao.prates@x.com', 'demo123');
  check('login inexistente -> credencial inválida', alerta.includes('Credenciais inválidas'), alerta);

  alerta = await typeLogin('rui@transportesalmeida.com.br', 'demo123');
  const t1 = JSON.parse((await tokens()) ?? 'null');
  check('login do admin do seed entra no /painel', (await url()) === '/painel' && !!t1?.refreshToken, `url=${await url()} alerta=${alerta}`);

  await goto(`${APP}/veiculos`);
  check('sessão persiste após reload', (await url()) === '/veiculos');

  await goto(`${APP}/login`);
  check('logado, /login redireciona pro painel', (await url()) === '/painel');

  // access inválido: /auth/me no boot deve renovar via refresh e continuar logado
  await evalJs(`localStorage.setItem('vetor.tokens', JSON.stringify({ ...JSON.parse(localStorage.getItem('vetor.tokens')), accessToken: 'lixo' }))`);
  await goto(`${APP}/painel`);
  await sleep(1000);
  const t2 = JSON.parse((await tokens()) ?? 'null');
  check('access expirado no reload é renovado sozinho', (await url()) === '/painel' && t2?.accessToken !== 'lixo' && t2?.refreshToken !== t1.refreshToken);

  // logout pelo menu
  await evalJs(`(async () => {
    document.querySelector('[aria-haspopup=true]').click();
    await new Promise(r => setTimeout(r, 300));
    [...document.querySelectorAll('[role=menuitem]')].find(b => b.textContent.includes('Sair')).click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
  check('logout volta pro /login e limpa tokens', (await url()) === '/login' && (await tokens()) === null);
  const revog = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: t2.refreshToken }) });
  check('refresh token revogado no servidor após logout', revog.status === 401, `status=${revog.status}`);

  await goto(`${APP}/painel`);
  check('após logout, /painel redireciona pra /login', (await url()) === '/login');

  // refresh revogado com sessão "restaurada": boot deve cair pro /login
  await evalJs(`localStorage.setItem('vetor.tokens', JSON.stringify({ accessToken: 'lixo', refreshToken: ${JSON.stringify(t2.refreshToken)} }))`);
  await goto(`${APP}/painel`);
  await sleep(1500);
  check('sessão restaurada com refresh revogado cai pro /login', (await url()) === '/login' && (await tokens()) === null, `url=${await url()}`);

  alerta = await typeLogin('root@vetor.dev', 'demo123');
  check('root é barrado no painel', alerta.includes('exclusivo do administrador') && (await url()) === '/login' && (await tokens()) === null, alerta);
});
