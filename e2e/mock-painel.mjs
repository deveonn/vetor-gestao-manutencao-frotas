// e2e: fim do mock no painel (itens 7-12 da varredura de 06/10/2026 — ver PENDENCIAS_DEPLOY.txt). Ver e2e/README.md.
import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOTORISTA, suite } from './lib.mjs';

const UPLOADS = fileURLToPath(new URL('../vetor-backend/uploads', import.meta.url));
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const arquivos = () => { try { return readdirSync(UPLOADS); } catch { return []; } };

await suite('Fim do mock no painel (itens 7-12)', async ({ APP, API, send, evalJs, goto, texto, loginAdmin, api, check, sleep, sql }) => {
  const antes = new Set(arquivos());
  const midias = [];
  const rnd = Math.floor(1000 + Math.random() * 9000);
  const placa = 'TST-F' + String(rnd).slice(1);
  const clicar = (txt, espera = 800) => evalJs(`(async () => { [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith(${JSON.stringify(txt)})).click(); await new Promise(r => setTimeout(r, ${espera})); })()`);

  try {
    await loginAdmin();

    // 7) foto da vistoria na tela de pneus (e nas vistorias recebidas)
    const veic = await api('/veiculos', 'POST', { placa, tipo: 'UTILITARIO' });
    const motTok = (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: MOTORISTA.login, senha: MOTORISTA.senha }) })).json()).accessToken;
    const subir = async () => {
      const form = new FormData();
      form.append('arquivo', new Blob([Buffer.from(PNG_B64, 'base64')], { type: 'image/png' }), 'foto.png');
      const m = await (await fetch(`${API}/midia`, { method: 'POST', headers: { Authorization: `Bearer ${motTok}` }, body: form })).json();
      midias.push(m.id);
      return m;
    };
    const fotoPneu = await subir();
    const fotoLataria = await subir();
    await fetch(`${API}/vistorias`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${motTok}` },
      body: JSON.stringify({ clienteId: `e2e-foto-${rnd}`, veiculoId: veic.id, itens: [
        { stepId: 'pneus', label: 'dianteiro esquerdo', avaliacao: 'TROCAR', observacao: 'bolha E2E', midiaId: fotoPneu.id },
        { stepId: 'lataria', label: 'lataria', avaliacao: 'ATENCAO', observacao: 'risco E2E', midiaId: fotoLataria.id },
      ] }),
    });
    const sinal = (await api('/pneus/sinalizados')).find((p) => p.veiculo.placa === placa);
    check('API: /pneus/sinalizados devolve a URL da foto da vistoria', sinal?.fotoUrl === fotoPneu.url, sinal?.fotoUrl);
    await goto(`${APP}/pneus`);
    await sleep(1500);
    const card = await evalJs(`(() => {
      const c = [...document.querySelectorAll('.flagged-grid > div')].find(d => d.textContent.includes(${JSON.stringify(placa)}));
      const img = c?.querySelector('img');
      return img ? { src: img.getAttribute('src'), carregou: img.complete && img.naturalWidth > 0 } : null;
    })()`);
    check('tela de pneus mostra a foto (carregada da API) no lugar do quadro cinza', card?.carregou && card.src === `${API.replace(/\/api$/, '')}${fotoPneu.url}`, JSON.stringify(card));
    const thumbs = await evalJs(`[...document.querySelectorAll('.insp-grid > div')].find(d => d.textContent.includes(${JSON.stringify(placa)}))?.querySelectorAll('.insp-fotos img').length ?? 0`);
    check('vistoria recebida mostra as miniaturas das fotos (pneu e lataria)', thumbs === 2, `miniaturas=${thumbs}`);

    // 8-9) relatórios: gerar sem espera, CSV de verdade, PDF pela impressão
    await goto(`${APP}/relatorios`);
    await sleep(1200);
    await evalJs(`[...document.querySelectorAll('.tipo-card')].find(b => b.textContent.includes('Custo por veículo')).click()`);
    const gerou = await evalJs(`(async () => {
      [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Gerar relatório')).click();
      await new Promise(r => setTimeout(r, 60));
      return !!document.querySelector('.no-print') && document.body.innerText.includes('Exportar CSV');
    })()`);
    check('"Gerar relatório" mostra o relatório na hora (sem o atraso falso de 650 ms)', gerou);
    const csv = await evalJs(`(async () => {
      let blob = null, nome = null;
      const orig = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (b) => { blob = b; return orig(b); };
      const clickOrig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { nome = this.download; };
      [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith('Exportar CSV')).click();
      HTMLAnchorElement.prototype.click = clickOrig; URL.createObjectURL = orig;
      // Blob.text() tira o BOM ao decodificar — confere os 3 primeiros bytes (EF BB BF) direto
      const bytes = blob ? [...new Uint8Array(await blob.slice(0, 3).arrayBuffer())] : [];
      return blob ? { nome, bom: bytes.join(',') === '239,187,191', texto: await blob.text() } : null;
    })()`);
    const custos = await api(`/relatorios/custo-por-veiculo?de=${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}&ate=${new Date().toISOString().slice(0, 10)}`);
    const linhasCsv = csv?.texto.trim().split('\r\n') ?? [];
    check('Exportar CSV baixa um arquivo de verdade: BOM pro Excel, cabeçalho, uma linha por veículo, ";" e vírgula decimal', csv?.bom && csv.texto.startsWith('Placa;Km rodados;Custo (R$);R$/km') && /^vetor-veiculo-frota-\d{4}-\d{2}-\d{2}\.csv$/.test(csv.nome) && linhasCsv.length === 1 + custos.length && linhasCsv.slice(1).every((l) => l.split(';').length === 4), `${csv?.nome} linhas=${linhasCsv.length} api=${custos.length}`);
    await evalJs(`window.__impresso = false; window.print = () => { window.__impresso = true; }`);
    await clicar('Exportar PDF', 300);
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    const imp = await evalJs(`({ impresso: window.__impresso, menu: getComputedStyle(document.querySelector('.side')).display, botoes: getComputedStyle(document.querySelector('.no-print')).display, fundo: getComputedStyle(document.body).backgroundColor, titulo: document.body.innerText.includes('Custo por veículo') })`);
    await send('Emulation.setEmulatedMedia', { media: '' });
    check('Exportar PDF abre a impressão; no modo impressão some o menu e os botões e o fundo fica branco', imp.impresso && imp.menu === 'none' && imp.botoes === 'none' && imp.fundo === 'rgb(255, 255, 255)' && imp.titulo, JSON.stringify(imp));

    // 10) sem números fixos no login nem link morto no menu
    const tPainel = await texto();
    check('menu lateral sem o link morto "acesso do provedor"', !tPainel.includes('acesso do provedor'));

    // 11) meta de km/L configurável
    await goto(`${APP}/conta`);
    await sleep(800);
    await evalJs(`(async () => {
      const el = [...document.querySelectorAll('label.field')].find(l => l.textContent.includes('Meta de consumo')).querySelector('input');
      el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Salvar alterações').click();
      await new Promise(r => setTimeout(r, 1500));
    })()`);
    const meta = (await api('/empresa')).metaKmL;
    await goto(`${APP}/painel`);
    await sleep(1200);
    check('meta de km/L salva em Configurações (API 10) e o dashboard passa a mostrar "meta 10,0 km/L"', meta === 10 && (await texto()).includes('meta 10,0 km/L'), `meta=${meta}`);

    // 12) sem o nome interno da plataforma pro cliente
    await goto(`${APP}/conta`);
    await sleep(600);
    await evalJs(`[...document.querySelectorAll('.tab-btn')][1].click()`);
    await sleep(400);
    const tInt = await texto();
    check('tela de rastreamento sem "Hapolo" e sem prometer telemetria', !tInt.includes('Hapolo') && tInt.includes('Plataforma de rastreamento') && !tInt.includes('sincronizando'));
  } finally {
    await api('/empresa', 'PATCH', { metaKmL: 9 }).catch(() => {});
    if (midias.length) sql(`DELETE FROM vistorias WHERE "clienteId" = 'e2e-foto-${rnd}'; DELETE FROM midias WHERE id IN (${midias.map((id) => `'${id}'`).join(',')});`);
    for (const f of arquivos()) if (!antes.has(f)) rmSync(`${UPLOADS}/${f}`);
  }

  // 10) tela de login: sem os números fixos ("7 veículos rodando · 1.284 km hoje · sincronizado 09:12")
  await goto(`${APP}/login`);
  await evalJs('localStorage.clear()');
  await goto(`${APP}/login`);
  const tLogin = await texto();
  check('tela de login sem números fixos de frota', !tLogin.includes('1.284 km hoje') && !tLogin.includes('veículos rodando') && !tLogin.includes('sincronizado 09:12') && tLogin.includes('vistoria pelo app'));
});
