// e2e: Dashboard e relatórios (Web #10). Pré-requisitos e como rodar: e2e/README.md.
import { suite } from './lib.mjs';

await suite('Dashboard e relatórios (Web #10)', async ({ APP, API, send, evalJs, goto, url, tokens, texto, typeLogin, loginAdmin, api, check, sleep, sql }) => {

  const money = (n) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
  const kpi = (label) => evalJs(`[...document.querySelectorAll('.kpi-card')].find(c => c.textContent.includes(${JSON.stringify(label)})).innerText.split('\\n').map(x => x.trim()).filter(Boolean)`);
  const alertas = () => evalJs(`[...document.querySelectorAll('.alert-row')].map(r => r.innerText.split('\\n').map(x => x.trim()).filter(Boolean))`);
  const trend = () => evalJs(`(() => { for (const el of document.querySelectorAll('vetor-chart')) { const c = ng.getComponent(el).chart; if (c && c.data.datasets.length === 2) return { labels: c.data.labels, custo: c.data.datasets[0].data, kml: c.data.datasets[1].data }; } return null; })()`);
  const cleanup = { abast: null, man: null };

  try {
    await loginAdmin();
    await goto(`${APP}/painel`);
    await sleep(800); // espera o count-up dos KPIs

    const cat0 = await api('/relatorios/categorias-semana');
    const res0 = await api('/dashboard/resumo');
    const al0 = await api('/dashboard/alertas');
    const atu0 = cat0.reduce((s, c) => s + c.atual, 0), ant0 = cat0.reduce((s, c) => s + c.anterior, 0);
    let k = await kpi('custo do período');
    const pct0 = ((atu0 / ant0 - 1) * 100).toFixed(1).replace('.', ',');
    check('KPI custo = soma de categorias-semana, com % e semana anterior reais', k.includes(money(atu0)) && k.some((x) => x.endsWith(pct0 + '%')) && k.some((x) => x.startsWith(`semana anterior ${money(ant0)}`)), JSON.stringify(k));
    k = await kpi('km/L médio');
    check('KPI km/L = /dashboard/resumo', k.includes(String(res0.kmLMedio).replace('.', ',')) && k.includes('meta 9,0 km/L'), JSON.stringify(k));
    k = await kpi('alertas ativos');
    let al = await alertas();
    check('alertas = /dashboard/alertas (qtd, títulos, críticos primeiro)', k.includes(String(al0.length)) && al.length === al0.length && al0.every((a, i) => al[i].includes(a.titulo)), `${al.length}/${al0.length}`);
    const cnh = al.find((a) => a.some((x) => x.startsWith('CNH de')));
    check('alerta sem veículo (CNH) mostra só o nível', !cnh || cnh.includes('crítico') || cnh.includes('atenção'), JSON.stringify(cnh));
    const badge = await evalJs(`document.querySelector('.topbar')?.innerText || ''`);
    let t = await texto();
    check('texto do resumo e destaque calculados (sem "16%"/"SBF-6A03" fixos)', !t.includes('puxado por manutenção corretiva') && !t.includes('R$ 1.180 nos freios') && !t.includes('13–19 jul') && t.includes(`a frota gastou ${money(atu0)}`) && t.includes('Custo em queda:'), t.slice(t.indexOf('Resumo da semana'), t.indexOf('Resumo da semana') + 160));

    const cs0 = await api('/dashboard/custo-semanal?semanas=8');
    const ks0 = await api('/abastecimentos/km-l-semanal?semanas=8');
    let tr = await trend();
    check('gráfico: 8 semanas, custo = /dashboard/custo-semanal e km/L = km-l-semanal', tr && tr.labels.length === 8 && JSON.stringify(tr.custo) === JSON.stringify(cs0.map((c) => c.total)) && JSON.stringify(tr.kml) === JSON.stringify(ks0.map((s) => s.kmLMedio)), JSON.stringify(tr));

    // mutações refletem no painel: abastecimento hoje + manutenção concluída com custo
    const veics = await api('/veiculos');
    const alvoV = veics.find((v) => v.placa === 'TAV-9C10');
    const forn = (await api('/fornecedores'))[0];
    const ab = await api('/abastecimentos', 'POST', { veiculoId: alvoV.id, fornecedorId: forn.id, litros: 100, valor: 1000, hodometro: alvoV.hodometro + 500 });
    cleanup.abast = { id: ab.id, veiculoId: alvoV.id, hod: alvoV.hodometro, kmL: alvoV.kmL };
    const pend = (await api('/manutencoes/pendentes')).find((m) => m.nivel === 'CRITICO');
    await api(`/manutencoes/${pend.id}/concluir`, 'POST', { custo: 500, oficina: 'Oficina E2E' });
    cleanup.man = pend.id;
    await goto(`${APP}/painel`);
    await sleep(800);
    k = await kpi('custo do período');
    const atu1 = atu0 + 1500;
    const pct1 = ((atu1 / ant0 - 1) * 100).toFixed(1).replace('.', ',');
    check('após +R$ 1.000 combustível e +R$ 500 manutenção: KPI e % recalculados', k.includes(money(atu1)) && k.some((x) => x.endsWith(pct1 + '%')), JSON.stringify(k));
    t = await texto();
    const manLinha = t.includes('Manutenção\nR$ 500') || /Manutenção[\s\S]{0,40}R\$ 500/.test(t);
    check('categoria Manutenção R$ 500 sem base (—) e destaque "Manutenção puxou a alta"', manLinha && t.includes('Manutenção puxou a alta:') && t.includes('+R$ 500'), t.slice(t.indexOf('O que fez gastar'), t.indexOf('O que fez gastar') + 300));
    check('resumo: "% acima da anterior, puxado por manutenção"', t.includes(`${Math.round((atu1 / ant0 - 1) * 100)}% acima da anterior, puxado por manutenção`));
    al = await alertas();
    check('manutenção concluída sai dos alertas; abastecimento anômalo (5 km/L) entra', ab.anomalo && al.length === al0.length - 1 + 1 && !al.some((a) => a.includes(`${pend.item} — ${pend.prazo}`)) && al.some((a) => a.some((x) => x.startsWith('Consumo anômalo: 5,0 km/L')) && a.some((x) => x.startsWith('TAV-9C10'))), `anomalo=${ab.anomalo} ${al.length}`);
    tr = await trend();
    check('gráfico: semana atual ganhou o custo novo', tr.custo[7] === Math.round((cs0[7].total + 1500) * 100) / 100, `${cs0[7].total} -> ${tr.custo[7]}`);

    // relatórios
    const hoje = new Date();
    const mesIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const cm = await api(`/relatorios/categorias-mensal?mesA=${mesIso(mesAnt)}&mesB=${mesIso(hoje)}`);
    const cv = await api('/relatorios/custo-por-veiculo');
    await goto(`${APP}/relatorios`);
    t = await texto();
    const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    check('cards de relatório com meses/período reais', t.includes(`${MES[mesAnt.getMonth()]} × ${MES[hoje.getMonth()]} ${hoje.getFullYear()}`) && t.includes(`${cm.length} categorias`) && t.includes('últimos 30 dias') && !t.includes('julho 2026'));
    await evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('Gerar')).click(); await new Promise(r => setTimeout(r, 1200)); })()`);
    t = await texto();
    const MESL = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const capM = MESL[hoje.getMonth()].charAt(0).toUpperCase() + MESL[hoje.getMonth()].slice(1);
    check('comparativo: categorias = API mensal, projeção calculada, gerado hoje', cm.every((c) => t.includes(money(c.atual)) && t.includes(money(c.anterior))) && t.includes(`${capM} projeta fechar`) && t.includes(`gerado ${String(hoje.getDate()).padStart(2, '0')} ${MES[hoje.getMonth()]} ${hoje.getFullYear()}`), t.slice(t.indexOf('projeta') - 20, t.indexOf('projeta') + 120));
    const linhasCv = await evalJs(`[...document.querySelectorAll('.card')].find(c => c.querySelector('h2')?.textContent.includes('Custo por veículo')).innerText`);
    check('custo por veículo = API (custo; R$/km "—" sem km)', cv.every((r) => linhasCv.includes(r.placa) && linhasCv.includes(money(r.custo))) && (cv.some((r) => r.custoPorKm == null) ? linhasCv.includes('—') : true) && !linhasCv.includes('NaN') && !linhasCv.includes('Infinity'));
  } finally {
    if (cleanup.abast) {
      sql(`DELETE FROM abastecimentos WHERE id = '${cleanup.abast.id}';`);
      sql(`UPDATE veiculos SET hodometro = ${cleanup.abast.hod}, "kmL" = ${cleanup.abast.kmL ?? 'NULL'} WHERE id = '${cleanup.abast.veiculoId}';`);
    }
    if (cleanup.man) sql(`UPDATE manutencoes SET status = 'PENDENTE', "concluidoEm" = NULL, custo = NULL, oficina = NULL WHERE id = '${cleanup.man}';`);
  }
});
