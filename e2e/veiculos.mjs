// e2e: Veículos (Web #5). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Veículos (Web #5)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const clicar = (txt, espera = 1200) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(txt)} || b.textContent.trim().endsWith(${JSON.stringify(txt)})).click(); await new Promise(r => setTimeout(r, ${espera})); })()`);
  const placasNaLista = () => evalJs(`[...document.querySelectorAll('.row')].map(r => (r.textContent.match(/[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}/) || [])[0]).filter(Boolean)`);
  const preencherVeiculo = (placa, modelo, tipo) => evalJs(`(async () => {
    const d = document.querySelector('.modal-dialog');
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
    const inputs = d.querySelectorAll('input');
    set(inputs[0], ${JSON.stringify(placa)}); set(inputs[1], ${JSON.stringify(modelo)}); set(d.querySelector('select'), ${JSON.stringify(tipo)});
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Adicionar veículo').click();
    await new Promise(r => setTimeout(r, 1500));
    return { modalAberto: !!document.querySelector('.modal-dialog'), erro: [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ') };
  })()`);
  const placaTeste = 'TST-' + Math.floor(1000 + Math.random() * 9000);

  await loginAdmin();

  const lista0 = await api('/veiculos');
  await goto(`${APP}/veiculos`);
  let placas = await placasNaLista();
  check('lista de veículos = GET /veiculos', JSON.stringify([...placas].sort()) === JSON.stringify(lista0.map((v) => v.placa).sort()), `${placas.length} na tela / ${lista0.length} na API`);

  const alvo = lista0.find((v) => v.motoristaAtual);
  const vinc = await api(`/veiculos/${alvo.id}/vinculos`);
  await goto(`${APP}/veiculos/${alvo.placa}`);
  await sleep(500);
  let t = await texto();
  check('detalhe (reload direto) mostra motorista e vínculos da API', t.includes(alvo.motoristaAtual.nome) && vinc.every((h) => t.includes(h.motorista.nome)) && t.includes('atual') && !t.includes('Paulo Cezar'), `${alvo.placa}: ${vinc.map((h) => h.motorista.nome).join(', ')}`);

  await goto(`${APP}/veiculos`);
  await clicar('Adicionar veículo', 300);
  let r = await preencherVeiculo('', 'x', 'Utilitário');
  check('placa vazia bloqueada no form', r.modalAberto && r.erro.includes('Informe a placa'), r.erro);
  r = await preencherVeiculo(lista0[0].placa, 'dup', 'Utilitário');
  check('placa duplicada -> erro 409 no modal', r.modalAberto && r.erro.includes('já está cadastrada'), r.erro);
  r = await preencherVeiculo(placaTeste.toLowerCase(), 'Modelo Teste', 'Van de carga');
  placas = await placasNaLista();
  const criado = (await api('/veiculos')).find((v) => v.placa === placaTeste);
  check('criar veículo -> modal fecha, aparece na lista, API tem tipo/pneus', !r.modalAberto && placas.includes(placaTeste) && criado?.tipo === 'VAN_CARGA' && criado?.modelo === 'Modelo Teste' && criado?.pneus.length === 4, `${placaTeste} ${r.erro}`);

  await goto(`${APP}/veiculos`);
  check('veículo criado persiste após reload', (await placasNaLista()).includes(placaTeste));

  await goto(`${APP}/veiculos/${placaTeste}`);
  await clicar('Excluir veículo', 300);
  await evalJs(`(async () => { [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Excluir veículo').click(); await new Promise(r => setTimeout(r, 1500)); })()`);
  placas = await placasNaLista();
  const aposExcluir = (await api('/veiculos')).map((v) => v.placa);
  check('excluir -> volta pra /veiculos, some da tela e da API', (await url()) === '/veiculos' && !placas.includes(placaTeste) && !aposExcluir.includes(placaTeste));

  await goto(`${APP}/painel`);
  t = await texto();
  check('dashboard carrega normal com dados reais', !t.includes('Não foi possível carregar') && !t.includes('Sua frota ainda não tem veículos'));

  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*/api/veiculos'] });
  await goto(`${APP}/painel`);
  t = await texto();
  check('API de veículos fora -> dashboard mostra estado de erro', t.includes('Não foi possível carregar os dados da frota'));
  await send('Network.setBlockedURLs', { urls: [] });
  await clicar('Tentar novamente', 1500);
  t = await texto();
  check('"Tentar novamente" recarrega e volta ao normal', !t.includes('Não foi possível carregar') && t.includes('Dados da frota recarregados'));
});
