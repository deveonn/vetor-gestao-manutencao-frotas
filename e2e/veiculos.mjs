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
  check('placa duplicada -> erro 409 no modal', r.modalAberto && r.erro.includes('já está na frota'), r.erro);
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

  // itens 4-6: status calculado, troca de óleo pela manutenção pendente, sem km hoje/combustível
  const rnd2 = Math.floor(1000 + Math.random() * 9000);
  const placaEst = 'TST-E' + String(rnd2).slice(1);
  const vEst = await api('/veiculos', 'POST', { placa: placaEst, tipo: 'UTILITARIO', modelo: 'Teste Estado' });
  const veics = await api('/veiculos');
  await goto(`${APP}/veiculos`);
  t = await texto();
  const linhaEst = await evalJs(`[...document.querySelectorAll('.row')].find(r => r.textContent.includes(${JSON.stringify(placaEst)}))?.innerText ?? ''`);
  check('lista: coluna "hodômetro" no lugar de "combustível"; status de cada veículo = API (calculado)', t.includes('hodômetro') && !t.includes('combustível') && veics.every((v) => v.status === (v.status === 'MANUTENCAO' ? 'MANUTENCAO' : v.motoristaAtualId ? 'RODANDO' : 'PARADO')), '');
  check('veículo novo sem motorista: "parado" e "sem troca agendada"', vEst.status === 'PARADO' && vEst.kmParaTroca === null && linhaEst.includes('sem troca agendada'), linhaEst.replace(/\n/g, ' | '));

  const mot = (await api('/motoristas')).find((m) => !m.veiculoAtual.length) ?? (await api('/motoristas'))[0];
  await api(`/veiculos/${vEst.id}/vinculos`, 'POST', { motoristaId: mot.id });
  await api('/manutencoes', 'POST', { veiculoId: vEst.id, item: 'E2E Troca de óleo', kmAlvo: vEst.hodometro + 3000 });
  await goto(`${APP}/veiculos/${placaEst}`);
  await sleep(500);
  t = await texto();
  check('vincular motorista -> "rodando"; agendar troca de óleo -> "em 3.000 km" no detalhe', t.includes('rodando') && t.includes('em 3.000 km') && (await api(`/veiculos/${vEst.id}`)).kmParaTroca === 3000, '');
  check('detalhe sem combustível nem "km rodados hoje" (não há rastreamento)', !t.includes('combustível') && !t.includes('rodados hoje') && t.includes('atualizado a cada abastecimento'));

  const disp0 = (await api('/dashboard/resumo')).veiculosDisponiveis;
  await clicar('Enviar pra oficina', 1500);
  t = await texto();
  const disp1 = (await api('/dashboard/resumo')).veiculosDisponiveis;
  check('"Enviar pra oficina" -> "em manutenção" e sai dos disponíveis do dashboard', t.includes('em manutenção') && (await api(`/veiculos/${vEst.id}`)).status === 'MANUTENCAO' && disp1 === disp0 - 1, `${disp0} -> ${disp1}`);
  await clicar('Saiu da oficina', 1500);
  t = await texto();
  check('"Saiu da oficina" -> volta a "rodando" (tem motorista) e aos disponíveis', t.includes('rodando') && (await api(`/veiculos/${vEst.id}`)).status === 'RODANDO' && (await api('/dashboard/resumo')).veiculosDisponiveis === disp0);
  await goto(`${APP}/painel`);
  check('dashboard sem "km hoje"', !(await texto()).includes('km hoje'));
  sql(`DELETE FROM vinculos_motorista_veiculo WHERE "veiculoId" = '${vEst.id}'; UPDATE veiculos SET "motoristaAtualId" = NULL WHERE id = '${vEst.id}';`);

  // editar veículo pelo detalhe: placa (a rota acompanha), modelo e tipo (posições de pneu)
  const placaEd = 'TST-G' + String(rnd2).slice(1);
  await goto(`${APP}/veiculos/${placaEst}`);
  await sleep(500);
  const preenchido = await evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Editar veículo')).click();
    await new Promise(r => setTimeout(r, 400));
    const d = document.querySelector('.modal-dialog');
    const [inPlaca, inModelo] = d.querySelectorAll('input');
    const antes = { placa: inPlaca.value, modelo: inModelo.value, tipo: d.querySelector('select').value };
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
    set(inPlaca, ${JSON.stringify(placaEd.toLowerCase())}); set(inModelo, 'Iveco Daily Teste'); set(d.querySelector('select'), 'Caminhão leve');
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Salvar alterações').click();
    await new Promise(r => setTimeout(r, 2500));
    return antes;
  })()`);
  const vEd = await api(`/veiculos/${vEst.id}`);
  check('"Editar veículo" vem preenchido; salvar troca placa (rota acompanha), modelo e tipo — caminhão ganha 6 pneus', preenchido.placa === placaEst && preenchido.modelo === 'Teste Estado' && vEd.placa === placaEd && vEd.modelo === 'Iveco Daily Teste' && vEd.tipo === 'CAMINHAO_LEVE' && vEd.pneus.length === 6 && (await url()) === `/veiculos/${placaEd}` && (await texto()).includes('Iveco Daily Teste'), `${vEd.placa} ${vEd.tipo} pneus=${vEd.pneus.length} url=${await url()}`);
  const dup = await evalJs(`(async () => {
    [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Editar veículo')).click();
    await new Promise(r => setTimeout(r, 400));
    const d = document.querySelector('.modal-dialog'); const el = d.querySelector('input');
    el.value = 'RTX-4B21'; el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Salvar alterações').click();
    await new Promise(r => setTimeout(r, 1500));
    const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
    [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return erro;
  })()`);
  check('editar pra uma placa que já existe -> erro no form, nada muda', dup.includes('já está cadastrada') && (await api(`/veiculos/${vEst.id}`)).placa === placaEd, dup);

  // excluir encerra o vínculo; cadastrar a mesma placa reativa o veículo com o histórico (decisão de 07/10/2026)
  const placaRe = 'TST-R' + String(rnd2).slice(1);
  const vRe = await api('/veiculos', 'POST', { placa: placaRe, tipo: 'UTILITARIO', modelo: 'Antigo' });
  const motRe = (await api('/motoristas'))[0];
  await api(`/veiculos/${vRe.id}/vinculos`, 'POST', { motoristaId: motRe.id });
  const fornRe = (await api('/fornecedores'))[0];
  await api('/abastecimentos', 'POST', { veiculoId: vRe.id, fornecedorId: fornRe.id, litros: 30, valor: 180, hodometro: 1000 });
  await api(`/veiculos/${vRe.id}`, 'DELETE');
  const vincRe = await api(`/veiculos/${vRe.id}/vinculos`);
  check('excluir veículo encerra o vínculo com o motorista', vincRe.length > 0 && vincRe.every((v) => v.ate), JSON.stringify(vincRe.map((v) => v.ate)));
  await goto(`${APP}/veiculos`);
  await clicar('Adicionar veículo', 400);
  const rRe = await preencherVeiculo(placaRe, 'Novo Modelo', 'Van de carga');
  const vDepoisRe = await api(`/veiculos/${vRe.id}`);
  const abastRe = (await api('/abastecimentos')).filter((a) => a.veiculo?.placa === placaRe || a.veiculoId === vRe.id);
  t = await texto();
  check('cadastrar a placa de um veículo excluído reativa o mesmo veículo (mesmo id, histórico de abastecimento junto, sem motorista, modelo/tipo novos)', !rRe.modalAberto && !vDepoisRe.arquivadoEm && vDepoisRe.modelo === 'Novo Modelo' && vDepoisRe.tipo === 'VAN_CARGA' && vDepoisRe.motoristaAtualId === null && abastRe.length === 1 && t.includes('reativado'), `${rRe.erro} arquivado=${vDepoisRe.arquivadoEm} abast=${abastRe.length}`);

  // um motorista dirige um veículo por vez: vincular a outro libera o anterior
  const vA = await api('/veiculos', 'POST', { placa: 'TST-A' + String(rnd2).slice(1, 4) + '1', tipo: 'UTILITARIO' });
  const vB = await api('/veiculos', 'POST', { placa: 'TST-B' + String(rnd2).slice(1, 4) + '1', tipo: 'UTILITARIO' });
  const motUm = (await api('/motoristas')).find((m) => !m.veiculoAtual.length) ?? (await api('/motoristas'))[0];
  const veicAntes = motUm.veiculoAtual[0]?.id ?? null;
  await api(`/veiculos/${vA.id}/vinculos`, 'POST', { motoristaId: motUm.id });
  await api(`/veiculos/${vB.id}/vinculos`, 'POST', { motoristaId: motUm.id });
  const [a2, b2] = [await api(`/veiculos/${vA.id}`), await api(`/veiculos/${vB.id}`)];
  const doMot = (await api('/veiculos')).filter((v) => v.motoristaAtualId === motUm.id).map((v) => v.placa);
  check('vincular o motorista a outro veículo libera o anterior (um veículo por motorista)', a2.motoristaAtualId === null && b2.motoristaAtualId === motUm.id && doMot.length === 1 && (await api(`/veiculos/${vA.id}/vinculos`)).every((v) => v.ate), doMot.join(','));
  if (veicAntes) await api(`/veiculos/${veicAntes}/vinculos`, 'POST', { motoristaId: motUm.id }); // devolve ao veículo do seed
});
