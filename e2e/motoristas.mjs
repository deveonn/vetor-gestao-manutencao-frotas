// e2e: Motoristas (Web #6). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Motoristas (Web #6)', async ({ APP, APP_MOBILE, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const linhas = () => evalJs(`[...document.querySelectorAll('.card .row')].map(r => [...r.children].map(c => c.textContent.trim()))`);
  const linha = async (nome) => (await linhas()).find((l) => l[0] === nome);
  const clicar = (txt, espera = 1200) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(txt)} || b.textContent.trim().endsWith(${JSON.stringify(txt)})).click(); await new Promise(r => setTimeout(r, ${espera})); })()`);
  /** `usuario`/`senha` do acesso ao app; usuario null = deixa a sugestão do form (gerada a partir do nome) */
  const cadastrar = (nome, cat, val, usuario, senha = 'senha123') => evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Cadastrar motorista')).click();
    await new Promise(r => setTimeout(r, 300));
    const d = document.querySelector('.modal-dialog');
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
    const [inNome, , inUsuario, inSenha] = d.querySelectorAll('input');
    set(inNome, ${JSON.stringify(nome)}); set(d.querySelector('select'), ${JSON.stringify(cat)}); set(d.querySelector('input[type=date]'), ${JSON.stringify(val)});
    ${usuario === null ? '' : `set(inUsuario, ${JSON.stringify(usuario)});`} set(inSenha, ${JSON.stringify(senha)});
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cadastrar motorista').click();
    await new Promise(r => setTimeout(r, 1500));
    const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
    if (document.querySelector('.modal-dialog')) [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return erro;
  })()`);
  const iso = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  const nomes = { ok: `Teste E2E ${rnd} Emdia`, vence: `Teste E2E ${rnd} Vence`, vencida: `Teste E2E ${rnd} Vencida`, sem: `Teste E2E ${rnd} Semval` };

  await loginAdmin();

  const mot0 = await api('/motoristas');
  await goto(`${APP}/motoristas`);
  let ls = await linhas();
  check('lista de motoristas = GET /motoristas', JSON.stringify(ls.map((l) => l[0])) === JSON.stringify(mot0.map((m) => m.nome)), `${ls.length} tela / ${mot0.length} API`);
  const comVeic = mot0.filter((m) => m.veiculoAtual.length);
  check('veículo e "vínculo desde" batem com a API', comVeic.every((m) => { const l = ls.find((x) => x[0] === m.nome); return l[4] === m.veiculoAtual[0].placa && l[5].startsWith('desde '); }) && comVeic.length > 0, `${comVeic.length} vinculados`);

  let erro = await cadastrar('   ', 'B', '');
  check('nome vazio bloqueado no form', erro.includes('Informe o nome'), erro);

  // acesso ao app: usuário sugerido pelo nome, senha curta e usuário já usado
  const sugerido = await evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Cadastrar motorista')).click();
    await new Promise(r => setTimeout(r, 300));
    const d = document.querySelector('.modal-dialog'); const [inNome, , inUsuario] = d.querySelectorAll('input');
    inNome.value = 'Márcia de Souza Lima'; inNome.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    const v = inUsuario.value;
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return v;
  })()`);
  check('form sugere o usuário do app a partir do nome', sugerido === 'marcia.de', sugerido);
  erro = await cadastrar(nomes.vence, 'D', iso(15), `e2e.${rnd}.v`, '123');
  check('senha do app com menos de 6 caracteres bloqueada no form', erro.includes('6 caracteres'), erro);
  erro = await cadastrar(nomes.vence, 'D', iso(15), 'joao.prates');
  check('usuário do app já usado -> "já está em uso" e nada é criado', erro.includes('já está em uso') && !(await api('/motoristas')).some((m) => m.nome === nomes.vence), erro);

  erro = await cadastrar(nomes.vence, 'D', iso(15), `e2e.${rnd}.v`);
  let l = await linha(nomes.vence);
  const criadoApi = (await api('/motoristas')).find((m) => m.nome === nomes.vence);
  check('cadastrar -> aparece com CNH D, validade mm/aaaa e "vence em N dias"', !erro && l && l[1] === 'D' && /^\d{2}\/\d{4}$/.test(l[2]) && /vence em 1[45] dias/.test(l[3]) && l[4] === 'sem vínculo' && criadoApi?.categoriaCnh === 'D', JSON.stringify(l) + erro);

  check('coluna app mostra o @usuário de quem tem acesso (cadastrado agora e do seed)', l?.[6].includes(`@e2e.${rnd}.v`) && (await linha('João Prates'))?.[6].includes('@joao.prates'), l?.[6]);

  await cadastrar(nomes.ok, 'C', iso(400), `e2e.${rnd}.ok`);
  await cadastrar(nomes.vencida, 'B', iso(-10), `e2e.${rnd}.vencida`);
  await cadastrar(nomes.sem, 'E', '', `e2e.${rnd}.sem`);
  check('situação da CNH: em dia / vencida / sem validade', (await linha(nomes.ok))?.[3] === 'em dia' && (await linha(nomes.vencida))?.[3] === 'vencida' && (await linha(nomes.sem))?.[3] === 'sem validade' && (await linha(nomes.sem))?.[2] === '—');

  await goto(`${APP}/motoristas`);
  check('cadastrados persistem após reload', [nomes.ok, nomes.vence, nomes.vencida, nomes.sem].every((n) => ls = true) && (await linhas()).filter((x) => x[0].startsWith(`Teste E2E ${rnd}`)).length === 4);

  // vínculo com veículo que depois é arquivado não pode continuar aparecendo
  const placa = 'TST-' + rnd;
  const veic = await api('/veiculos', 'POST', { placa, tipo: 'UTILITARIO' });
  await api(`/veiculos/${veic.id}/vinculos`, 'POST', { motoristaId: criadoApi.id });
  await goto(`${APP}/motoristas`);
  l = await linha(nomes.vence);
  check('vínculo novo aparece com placa e "desde"', l?.[4] === placa && l?.[5].startsWith('desde '), JSON.stringify(l));
  await api(`/veiculos/${veic.id}`, 'DELETE');
  await goto(`${APP}/motoristas`);
  l = await linha(nomes.vence);
  check('veículo arquivado some do motorista (sem vínculo)', l?.[4] === 'sem vínculo' && l?.[5] === '—', JSON.stringify(l));

  // motorista cadastrado pelo painel entra no app de verdade (tela de login do app mobile)
  const entrarNoApp = async (usuario, senha) => {
    await goto(`${APP_MOBILE}/login`);
    await evalJs('localStorage.clear()');
    await goto(`${APP_MOBILE}/login`);
    return evalJs(`(async () => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name=username]', ${JSON.stringify(usuario)}); set('input[name=password]', ${JSON.stringify(senha)});
      document.querySelector('button[type=submit]').click();
      await new Promise(r => setTimeout(r, 2500));
      return location.pathname + ' | ' + document.body.innerText.slice(0, 300);
    })()`);
  };
  let app = await entrarNoApp(`e2e.${rnd}.ok`, 'senha123');
  check('motorista cadastrado no painel entra no app com o usuário e a senha definidos', app.startsWith('/tabs'), app.slice(0, 120));

  // redefinir senha pelo painel: a senha antiga deixa de valer e a nova entra
  await loginAdmin();
  await goto(`${APP}/motoristas`);
  const acesso = (txtBotao, nome, usuario, senha) => evalJs(`(async () => {
    const row = [...document.querySelectorAll('.card .row')].find(r => r.children[0].textContent.trim() === ${JSON.stringify(nome)});
    [...row.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(txtBotao)}).click();
    await new Promise(r => setTimeout(r, 300));
    const d = document.querySelector('.modal-dialog');
    const ins = [...d.querySelectorAll('input')].filter(i => !i.disabled);
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    if (${JSON.stringify(usuario)} !== null) set(ins[0], ${JSON.stringify(usuario)});
    set(ins[ins.length - 1], ${JSON.stringify(senha)});
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => /Redefinir senha|Criar acesso/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 1500));
    const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
    if (document.querySelector('.modal-dialog')) [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return erro;
  })()`);
  const loginApi = async (login, senha) => (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, senha }) })).status;
  erro = await acesso('redefinir senha', nomes.ok, null, 'nova12345');
  check('redefinir senha pelo painel: antiga -> 401, nova -> entra', !erro && (await loginApi(`e2e.${rnd}.ok`, 'senha123')) === 401 && (await loginApi(`e2e.${rnd}.ok`, 'nova12345')) === 201, erro);

  // motorista sem acesso (cadastrado antes da mudança, ou pela API sem login): criar acesso pelo painel
  const semAcesso = `Teste E2E ${rnd} Antigo`;
  await api('/motoristas', 'POST', { nome: semAcesso, categoriaCnh: 'B' });
  await goto(`${APP}/motoristas`);
  const lAntigo = await linha(semAcesso);
  erro = await acesso('criar acesso', semAcesso, `e2e.${rnd}.antigo`, 'senha456');
  const lDepois = await linha(semAcesso);
  check('motorista sem acesso aparece como "sem acesso" e ganha login pelo "criar acesso"', lAntigo?.[6].includes('sem acesso') && !erro && lDepois?.[6].includes(`@e2e.${rnd}.antigo`) && (await loginApi(`e2e.${rnd}.antigo`, 'senha456')) === 201, `${lAntigo?.[6]} -> ${lDepois?.[6]} ${erro}`);
});
