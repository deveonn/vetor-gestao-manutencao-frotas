// e2e: Integração de rastreamento (Web #4). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Integração de rastreamento (Web #4)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const token = async () => JSON.parse(await tokens()).accessToken;
  const apiInteg = async () => (await fetch(`${API}/integracoes/rastreamento`, { headers: { Authorization: `Bearer ${await token()}` } })).json();
  const abrirIntegracoes = async () => { await goto(`${APP}/conta`); await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Integrações').click()`); await sleep(300); };
  const clicar = (txt) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(txt)}).click(); await new Promise(r => setTimeout(r, 1200)); })()`);
  const conectar = (tok) => evalJs(`(async () => {
    const el = document.querySelector('input[placeholder^=hap_live]'); el.value = ${JSON.stringify(tok)}; el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Conectar').click();
    await new Promise(r => setTimeout(r, 1500));
    return [...document.querySelectorAll('[role=alert]')].map(a => a.textContent.trim()).join(' / ');
  })()`);

  await loginAdmin();
  const i0 = await apiInteg();
  await abrirIntegracoes();
  let t = await texto();
  check('estado inicial vem da API (seed conectado)', i0.status === 'CONECTADO' && t.includes('conectada') && t.includes(i0.tokenCauda) && /conectado desde \d{2} \w{3} \d{4}/.test(t) && !t.includes('Rastreamento desconectado'), `cauda=${i0.tokenCauda}`);

  await clicar('Testar conexão');
  check('testar conexão chama a API e mostra toast', (await texto()).includes('Conexão com a Hapolo OK'));

  await clicar('Remover token');
  t = await texto();
  const i1 = await apiInteg();
  check('remover token -> SEM na API, banner e form de conexão aparecem', i1.status === 'SEM' && t.includes('Rastreamento desconectado') && t.includes('sem rastreamento') && t.includes('Token de integração'), i1.status);

  await abrirIntegracoes();
  t = await texto();
  check('estado sem token persiste após reload', t.includes('sem token') && t.includes('Rastreamento desconectado'));

  let alerta = await conectar('abc123');
  check('token sem prefixo hap_ é recusado sem chamar a API', alerta.includes('Token não reconhecido') && (await apiInteg()).status === 'SEM', alerta);

  alerta = await conectar('hap_test_novo1234');
  t = await texto();
  const i2 = await apiInteg();
  check('conectar token válido -> CONECTADO com cauda nova', i2.status === 'CONECTADO' && i2.tokenCauda === '1234' && t.includes('1234') && !t.includes('Rastreamento desconectado'), `${i2.status}/${i2.tokenCauda} alerta=${alerta}`);

  // restaura o estado do seed (cauda x4T9)
  await clicar('Remover token');
  await conectar('hap_live_seed_x4T9');
  check('restaura estado do seed', (await apiInteg()).tokenCauda === 'x4T9');
});
