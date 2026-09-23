// e2e: Conta/empresa (Web #3). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Conta/empresa (Web #3)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const token = async () => JSON.parse(await tokens()).accessToken;
  const apiEmpresa = async () => (await fetch(`${API}/empresa`, { headers: { Authorization: `Bearer ${await token()}` } })).json();
  const formVals = () => evalJs(`[...document.querySelectorAll('.card input')].slice(0, 5).map(i => i.value)`);
  const salvar = (idx, valor) => evalJs(`(async () => {
    const el = document.querySelectorAll('.card input')[${idx}]; el.value = ${JSON.stringify(valor)}; el.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('button')].find(b => b.textContent.includes('Salvar')).click();
    await new Promise(r => setTimeout(r, 1200));
    return [...document.querySelectorAll('[role=alert]')].map(a => a.textContent.trim()).join(' / ') + ' || ' + document.body.innerText.includes('Alterações salvas');
  })()`);

  await loginAdmin();
  const e0 = await apiEmpresa();
  await sleep(500);
  const sidebar = await evalJs('document.body.textContent');
  check('shell mostra empresa e contato vindos da API', sidebar.includes(e0.nome) && sidebar.includes(e0.contatoNome), `${e0.nome} / ${e0.contatoNome}`);

  await goto(`${APP}/conta`);
  let v = await formVals();
  check('reload direto em /conta preenche o form com a API', JSON.stringify(v) === JSON.stringify([e0.nome, e0.cnpj, e0.contatoNome, e0.contatoEmail, e0.contatoFone]), JSON.stringify(v));

  let r = await salvar(4, '(11) 90000-0000');
  const e1 = await apiEmpresa();
  check('salvar telefone persiste via PATCH e mostra toast', e1.contatoFone === '(11) 90000-0000' && r.endsWith('true'), r);

  await goto(`${APP}/conta`);
  v = await formVals();
  check('valor salvo aparece após reload', v[4] === '(11) 90000-0000', v[4]);

  r = await salvar(3, 'email-invalido');
  const e2 = await apiEmpresa();
  check('e-mail inválido mostra erro e não salva', r.includes('E-mail inválido') && e2.contatoEmail === e0.contatoEmail, r);

  await goto(`${APP}/conta`);
  r = await salvar(4, e0.contatoFone);
  check('restaura telefone original', (await apiEmpresa()).contatoFone === e0.contatoFone);

  const dup = await fetch(`${API}/veiculos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ placa: 'RTX-4B21', tipo: 'UTILITARIO' }) });
  check('filtro Prisma: placa duplicada -> 409', dup.status === 409, `status=${dup.status} ${JSON.stringify(await dup.json())}`);
});
