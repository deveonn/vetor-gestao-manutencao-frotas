// Infra comum das suítes e2e: Chrome headless dirigido via DevTools Protocol (sem dependências — só Node >= 22),
// helpers de navegação/login e limpeza dos dados de teste. Ver e2e/README.md.
import { execSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP = process.env.APP_URL ?? 'http://localhost:4200';
export const API = process.env.API_URL ?? 'http://localhost:3000/api';
export const APP_MOBILE = process.env.APP_MOBILE_URL ?? 'http://localhost:8100';
const CHROME = process.env.CHROME_BIN ?? 'google-chrome';
const PORTA_CDP = Number(process.env.CDP_PORT ?? 9333);
const BACKEND_DIR = fileURLToPath(new URL('../vetor-backend', import.meta.url));

export const ADMIN = { login: 'rui@transportesalmeida.com.br', senha: 'demo123' };
export const MOTORISTA = { login: 'joao.prates', senha: 'demo123', nome: 'João Prates' };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** SQL direto no banco do backend (via Prisma, usando o .env do vetor-backend) — só pra preparar/limpar dados de teste. */
export function sql(q) {
  execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', { cwd: BACKEND_DIR, input: q, stdio: ['pipe', 'pipe', 'pipe'] });
}

/** Tudo que as suítes criam usa estes prefixos; roda depois de cada suíte, passando ou não. */
export function limparDadosDeTeste() {
  sql(`
    DELETE FROM vistorias WHERE "clienteId" LIKE 'e2e-%';
    DELETE FROM abastecimentos WHERE "veiculoId" IN (SELECT id FROM veiculos WHERE placa LIKE 'TST-%');
    DELETE FROM vinculos_motorista_veiculo WHERE "motoristaId" IN (SELECT id FROM motoristas WHERE nome LIKE 'Teste E2E %');
    DELETE FROM veiculos WHERE placa LIKE 'TST-%';
    DELETE FROM motoristas WHERE nome LIKE 'Teste E2E %';
    DELETE FROM fornecedores WHERE nome LIKE 'Posto E2E %';
  `);
}

/**
 * Roda uma suíte: sobe o Chrome, conecta via CDP e chama `corpo(ctx)`. Imprime PASS/FAIL por cenário e
 * sai com código 1 se algum falhar (ou se a suíte lançar erro).
 */
export async function suite(nome, corpo) {
  const perfil = mkdtempSync(join(tmpdir(), 'vetor-e2e-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`, 'about:blank',
  ], { stdio: 'ignore' });

  const resultados = [];
  const check = (cenario, ok, extra = '') => {
    // detalhe em uma linha só e curto — é pra diagnóstico, não pra log
    const det = String(extra).replace(/\s*\n\s*/g, ' ⏎ ').slice(0, 160);
    resultados.push(`${ok ? 'PASS' : 'FAIL'} ${cenario}${det ? ' — ' + det : ''}`);
  };
  let ws;
  let id = 0;
  const pendentes = new Map();

  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id;
    pendentes.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const goto = async (url) => { await send('Page.navigate', { url }); await sleep(2500); };
  const url = () => evalJs('location.pathname');
  const tokens = () => evalJs("localStorage.getItem('vetor.tokens')");
  const texto = () => evalJs('document.body.innerText');

  /** Preenche e envia o form de login; devolve o texto dos alertas exibidos. */
  const typeLogin = (email, senha) => evalJs(`(async () => {
    const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('input[name=email]', ${JSON.stringify(email)}); set('input[name=pass]', ${JSON.stringify(senha)});
    await new Promise(r => setTimeout(r, 100));
    [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Entrar').click();
    await new Promise(r => setTimeout(r, 2000));
    return [...document.querySelectorAll('[role=alert]')].map(a => a.textContent.trim()).join(' / ');
  })()`);

  /** Sessão limpa + login do admin do seed pela tela. */
  const loginAdmin = async () => {
    await goto(`${APP}/login`);
    await evalJs('localStorage.clear()');
    await goto(`${APP}/login`);
    await typeLogin(ADMIN.login, ADMIN.senha);
  };

  /** Chamada à API com o token da sessão do navegador (ou um token explícito). */
  const api = async (path, method = 'GET', body, token) => {
    const tok = token ?? JSON.parse(await tokens()).accessToken;
    const r = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.status === 204 ? null : r.json();
  };

  let erro = null;
  try {
    let alvos;
    for (let i = 0; i < 30 && !alvos; i++) {
      try { alvos = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`)).json(); } catch { await sleep(300); }
    }
    if (!alvos) throw new Error(`Chrome não respondeu na porta ${PORTA_CDP} (CHROME_BIN=${CHROME})`);
    ws = new WebSocket(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pendentes.has(d.id)) { pendentes.get(d.id)(d.result ?? {}); pendentes.delete(d.id); }
    };
    await send('Page.enable');
    await send('Runtime.enable');

    await corpo({ APP, API, APP_MOBILE, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql });
  } catch (e) {
    erro = e;
  } finally {
    ws?.close();
    chrome.kill();
    try { limparDadosDeTeste(); } catch (e) { resultados.push('ERRO limpeza: ' + e.message); }
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil temporário */ }
  }

  console.log(`== ${nome}`);
  console.log(resultados.join('\n'));
  if (erro) console.log('ERRO ' + erro.message);
  const falhou = !!erro || resultados.some((r) => !r.startsWith('PASS'));
  process.exitCode = falhou ? 1 : 0;
}
