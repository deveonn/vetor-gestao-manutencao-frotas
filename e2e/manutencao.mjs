// e2e: Manutenção (Web #8). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Manutenção (Web #8)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const lerPendentes = () => evalJs(`[...document.querySelectorAll('.upcoming-row')].map(r => [...r.children].map(c => c.textContent.trim()))`);
  const hist = () => evalJs(`[...document.querySelectorAll('.hist-row')].map(r => [...r.children].map(c => c.textContent.trim()))`);
  /** "Marcar como feita" abre o modal de custo/oficina (item 3); devolve o erro mostrado no modal, se houver */
  const concluirNaTela = (placa, item, custo = '420,00', oficina = 'Oficina E2E') => evalJs(`(async () => {
    const row = [...document.querySelectorAll('.upcoming-row, .card div')].find(r => r.querySelector('.btn-conclude') && (location.pathname.startsWith('/veiculos/') || r.textContent.includes(${JSON.stringify(placa)})) && r.textContent.includes(${JSON.stringify(item)}));
    row.querySelector('.btn-conclude').click();
    await new Promise(r => setTimeout(r, 400));
    const d = document.querySelector('.modal-dialog');
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    const [inCusto, inOficina] = d.querySelectorAll('input');
    set(inCusto, ${JSON.stringify(custo)}); set(inOficina, ${JSON.stringify(oficina)});
    await new Promise(r => setTimeout(r, 100));
    [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Concluir manutenção').click();
    await new Promise(r => setTimeout(r, 1500));
    const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
    if (document.querySelector('.modal-dialog')) [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
    return erro;
  })()`);
  const concluidos = [];
  const rnd = Math.floor(1000 + Math.random() * 9000);

  try {
    await loginAdmin();

    const p0 = await api('/manutencoes/pendentes');
    const h0 = await api('/manutencoes/historico');
    const pl0 = await api('/manutencoes/planos');
    await goto(`${APP}/manutencao`);
    let ps = await lerPendentes();
    check('pendentes = API (placa, item, prazo, ordem por km restante)', ps.length === p0.length && p0.every((m, i) => ps[i][1] === m.veiculo.placa && ps[i][2] === m.item && ps[i][4] === m.prazo), `${ps.length}/${p0.length}`);
    let hs = await hist();
    check('histórico = API (data, placa, item, oficina, custo)', hs.length === h0.length && h0.every((m, i) => hs[i][1] === m.veiculo.placa && hs[i][2] === m.item && hs[i][3] === m.oficina && hs[i][4] === 'R$ ' + Math.round(m.custo).toLocaleString('pt-BR')), `${hs.length}/${h0.length}`);
    const t = await texto();
    check('planos por tipo com modelos da frota e itens da API', t.includes('Utilitário — Fiorino, Saveiro') && t.includes('Van de carga — Sprinter 415, Master') && pl0.every((p) => p.itens.every((it) => t.includes(it.item) && t.includes(`${it.km} · ${it.tempo}`))));

    // concluir pela tela de manutenção — com custo e oficina (item 3)
    const alvo = p0[p0.length - 1];
    let erroC = await concluirNaTela(alvo.veiculo.placa, alvo.item, '', '');
    check('concluir sem custo -> bloqueado no modal, nada concluído', erroC.includes('Informe o custo') && (await api('/manutencoes/pendentes')).some((m) => m.id === alvo.id), erroC);
    const resumo0 = await api('/dashboard/resumo');
    const manSem0 = (await api('/relatorios/categorias-semana')).find((c) => c.categoria === 'Manutenção').atual;
    erroC = await concluirNaTela(alvo.veiculo.placa, alvo.item, '1.180,50', 'Oficina Mecvel E2E');
    concluidos.push(alvo.id);
    ps = await lerPendentes(); hs = await hist();
    const p1 = await api('/manutencoes/pendentes'); const h1 = await api('/manutencoes/historico');
    check('concluir com custo "1.180,50" e oficina -> topo do histórico com R$ 1.181 e a oficina; API com 1180.5', !erroC && !ps.some((r) => r[1] === alvo.veiculo.placa && r[2] === alvo.item) && hs[0][1] === alvo.veiculo.placa && hs[0][2] === alvo.item && hs[0][3] === 'Oficina Mecvel E2E' && hs[0][4] === 'R$ 1.181' && !p1.some((m) => m.id === alvo.id) && h1[0].id === alvo.id && h1[0].custo === 1180.5, JSON.stringify(hs[0]) + erroC);
    const resumo1 = await api('/dashboard/resumo');
    const manSem1 = (await api('/relatorios/categorias-semana')).find((c) => c.categoria === 'Manutenção').atual;
    check('o custo entra no custo da semana do dashboard e na categoria Manutenção do relatório', Math.round((resumo1.custoSemana - resumo0.custoSemana) * 100) === 118050 && Math.round((manSem1 - manSem0) * 100) === 118050, `dashboard +${(resumo1.custoSemana - resumo0.custoSemana).toFixed(2)} relatório +${(manSem1 - manSem0).toFixed(2)}`);

    // concluir pelo detalhe do veículo
    const alvo2 = p1[0];
    await goto(`${APP}/veiculos/${alvo2.veiculo.placa}`);
    erroC = await concluirNaTela(alvo2.veiculo.placa, alvo2.item, '0', '');
    concluidos.push(alvo2.id);
    const h2 = (await api('/manutencoes/historico')).find((m) => m.id === alvo2.id);
    check('concluir pelo detalhe do veículo (custo 0, garantia) reflete na API', !erroC && !(await api('/manutencoes/pendentes')).some((m) => m.id === alvo2.id) && h2?.custo === 0, erroC);
    await goto(`${APP}/manutencao`);
    check('...e some da tela de manutenção após reload', !(await lerPendentes()).some((r) => r[1] === alvo2.veiculo.placa && r[2] === alvo2.item));

    // concorrência: concluída em outro lugar enquanto a tela estava aberta
    const alvo3 = (await api('/manutencoes/pendentes'))[0];
    await api(`/manutencoes/${alvo3.id}/concluir`, 'POST', {});
    concluidos.push(alvo3.id);
    await concluirNaTela(alvo3.veiculo.placa, alvo3.item);
    check('concluir item já concluído (tela desatualizada) -> 409 tratado, item some', (await texto()).includes('já tinha sido concluída') && !(await lerPendentes()).some((r) => r[1] === alvo3.veiculo.placa && r[2] === alvo3.item));

    // agendar manutenção (item 2) — num veículo de teste, pra não mexer no hodômetro dos veículos do seed
    const placaAg = 'TST-A' + String(rnd).slice(1);
    const vAg = await api('/veiculos', 'POST', { placa: placaAg, tipo: 'UTILITARIO' });
    const agendar = (campos) => evalJs(`(async () => {
      const d = document.querySelector('.modal-dialog');
      const set = (el, v) => { el.value = v; el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
      const c = ${JSON.stringify(campos)};
      if (c.placa) set(d.querySelector('select'), c.placa);
      await new Promise(r => setTimeout(r, 100));
      const [inItem, inKm, inData] = d.querySelectorAll('input');
      if (c.item) set(inItem, c.item); if (c.km != null) set(inKm, String(c.km)); if (c.data) set(inData, c.data);
      await new Promise(r => setTimeout(r, 150));
      const hint = d.innerText;
      [...d.querySelectorAll('button')].find(b => b.textContent.trim() === 'Agendar manutenção').click();
      await new Promise(r => setTimeout(r, 1800));
      const erro = [...document.querySelectorAll('.modal-dialog [role=alert]')].map(a => a.textContent.trim()).join(' / ');
      if (document.querySelector('.modal-dialog')) [...document.querySelectorAll('.modal-dialog button')].find(b => b.textContent.trim() === 'Cancelar').click();
      return { erro, hint };
    })()`);
    const abrirAgendar = (seletor) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith(${JSON.stringify(seletor)})).click(); await new Promise(r => setTimeout(r, 400)); })()`);
    await goto(`${APP}/manutencao`);
    await abrirAgendar('Agendar manutenção');
    let ag = await agendar({ placa: placaAg, item: 'E2E sem meta' });
    check('agendar sem km nem data -> bloqueado no form', ag.erro.includes('km e/ou a data'), ag.erro);
    await abrirAgendar('Agendar manutenção');
    ag = await agendar({ placa: placaAg, item: 'E2E por km', km: 2000 });
    let linhaAg = (await lerPendentes()).find((r) => r[1] === placaAg && r[2] === 'E2E por km');
    const pAg = (await api('/manutencoes/pendentes')).find((m) => m.item === 'E2E por km');
    check('agendar por km pela tela -> aparece "em 2.000 km" (meta = hodômetro + 2.000)', !ag.erro && linhaAg?.[4] === 'em 2.000 km' && pAg?.kmAlvo === vAg.hodometro + 2000 && pAg?.nivel === 'OK', JSON.stringify(linhaAg) + ag.erro);

    const em10 = new Date(Date.now() + 10 * 86400000 - 3 * 3600000).toISOString().slice(0, 10);
    await goto(`${APP}/veiculos/${placaAg}`);
    await abrirAgendar('+ agendar');
    const placaPre = await evalJs(`document.querySelector('.modal-dialog select').value`);
    ag = await agendar({ item: 'E2E por data', data: em10 });
    const dash = await api('/dashboard/alertas');
    check('agendar pelo detalhe do veículo já vem com a placa; por data -> "em 10 dias", atenção e alerta no dashboard', placaPre === placaAg && !ag.erro && (await texto()).includes('E2E por data') && dash.some((a) => a.titulo === 'E2E por data — em 10 dias' && a.nivel === 'atencao' && a.veiculo === placaAg), `placa=${placaPre} ${ag.erro}`);

    // a urgência acompanha o hodômetro: abastecimento +1.200 km -> "em 800 km", atenção
    const forn = (await api('/fornecedores'))[0];
    await api('/abastecimentos', 'POST', { veiculoId: vAg.id, fornecedorId: forn.id, litros: 40, valor: 250, hodometro: vAg.hodometro + 1200 });
    await goto(`${APP}/manutencao`);
    linhaAg = (await lerPendentes()).find((r) => r[1] === placaAg && r[2] === 'E2E por km');
    const pAg2 = (await api('/manutencoes/pendentes')).find((m) => m.item === 'E2E por km');
    check('abastecimento sobe o hodômetro -> a mesma manutenção passa a "em 800 km" e atenção sozinha', linhaAg?.[4] === 'em 800 km' && pAg2?.nivel === 'ATENCAO', JSON.stringify(linhaAg));

    // pendência de veículo arquivado não aparece
    const veic = await api('/veiculos', 'POST', { placa: 'TST-' + rnd, tipo: 'UTILITARIO' });
    sql(`INSERT INTO manutencoes (id, "empresaId", "veiculoId", item, status, "kmRestante", nivel, prazo) VALUES ('e2e-man-${rnd}', '${veic.empresaId}', '${veic.id}', 'Item E2E ${rnd}', 'PENDENTE', 100, 'CRITICO', 'em 100 km');`);
    await goto(`${APP}/manutencao`);
    const antes = (await lerPendentes()).some((r) => r[2] === `Item E2E ${rnd}`);
    await api(`/veiculos/${veic.id}`, 'DELETE');
    await goto(`${APP}/manutencao`);
    const depois = (await lerPendentes()).some((r) => r[2] === `Item E2E ${rnd}`);
    check('pendência de veículo arquivado some da lista', antes && !depois, `antes=${antes} depois=${depois}`);
  } finally {
    if (concluidos.length) sql(`UPDATE manutencoes SET status = 'PENDENTE', "concluidoEm" = NULL, custo = NULL, oficina = NULL WHERE id IN (${concluidos.map((id) => `'${id}'`).join(',')});`);
    sql(`DELETE FROM abastecimentos WHERE "veiculoId" IN (SELECT id FROM veiculos WHERE placa LIKE 'TST-%'); DELETE FROM veiculos WHERE placa LIKE 'TST-%';`);
  }
});
