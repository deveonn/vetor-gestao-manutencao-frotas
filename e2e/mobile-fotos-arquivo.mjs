// e2e: app mobile — fotos da vistoria guardadas como arquivo (Filesystem), não em base64 no Preferences. Ver e2e/README.md.
import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOTORISTA, suite } from './lib.mjs';

const UPLOADS = fileURLToPath(new URL('../vetor-backend/uploads', import.meta.url));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const arquivos = () => { try { return readdirSync(UPLOADS); } catch { return []; } };

await suite('Mobile: fotos em arquivo (Filesystem)', async ({ API, APP_MOBILE, send, evalJs, goto, url, check, sleep, sql }) => {
  const antes = new Set(arquivos());
  const prefsBrutos = (k) => evalJs(`localStorage.getItem('CapacitorStorage.${k}') ?? ''`);
  const fila = async () => JSON.parse((await prefsBrutos('vetor.queue')) || '[]');
  const gravarFila = (itens) => evalJs(`localStorage.setItem('CapacitorStorage.vetor.queue', ${JSON.stringify(JSON.stringify(itens))})`);
  const bloquearApi = (sim) => send('Network.setBlockedURLs', { urls: sim ? [`${API}/*`] : [] });
  const reabrir = async (rota, ms) => { await goto(`${APP_MOBILE}${rota}`); await sleep(ms); };
  /** arquivos de foto no Filesystem — no navegador o plugin guarda no IndexedDB "Disc" */
  const fotosNoAparelho = () => evalJs(`new Promise((r) => {
    const q = indexedDB.open('Disc');
    q.onsuccess = () => {
      const db = q.result;
      if (!db.objectStoreNames.contains('FileStorage')) { db.close(); return r([]); }
      const g = db.transaction('FileStorage', 'readonly').objectStore('FileStorage').getAllKeys();
      g.onsuccess = () => { db.close(); r(g.result.filter((k) => String(k).includes('/fotos/') && !String(k).endsWith('/fotos'))); };
    };
    q.onerror = () => r([]);
  })`);
  const temArquivo = async (path) => (await fotosNoAparelho()).some((k) => k.endsWith(path));
  /** "tira" a foto: a câmera web do Capacitor cai num <input type=file> — entrega um PNG nele */
  const tirarFoto = () => evalJs(`(async () => {
    document.querySelector('.rate__photo-cta, .rate__retake').click();
    let input;
    for (let i = 0; i < 30 && !(input = document.querySelector('#_capacitor-camera-input')); i++) await new Promise(r => setTimeout(r, 100));
    const blob = await (await fetch(${JSON.stringify(PNG)})).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'foto.png', { type: 'image/png' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 1200));
  })()`);
  const rascunho = async () => JSON.parse((await prefsBrutos('vetor.inspection-draft')) || 'null');
  const midias = new Set();
  await send('Network.enable');

  try {
    await goto(`${APP_MOBILE}/login`);
    await evalJs('localStorage.clear()');
    await reabrir('/login', 1500);
    await evalJs(`(async () => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name=username]', ${JSON.stringify(MOTORISTA.login)}); set('input[name=password]', 'demo123');
      document.querySelector('button[type=submit]').click();
      await new Promise(r => setTimeout(r, 2500));
    })()`);
    const veiculoId = JSON.parse(await prefsBrutos('vetor.veiculo-do-dia')).id;

    // 1) foto tirada na tela de avaliação vira arquivo; o rascunho guarda só o caminho
    await goto(`${APP_MOBILE}/confirmar-veiculo`);
    await sleep(800);
    await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('sim, é')).click()`);
    await sleep(800);
    await goto(`${APP_MOBILE}/vistoria/avaliar/lataria/0`);
    await sleep(800);
    await evalJs(`[...document.querySelectorAll('.rate-option')].find(b => b.textContent.includes('precisa de atenção')).click()`);
    await sleep(300);
    await tirarFoto();
    const r1 = await rascunho();
    const path1 = r1?.steps.find((s) => s.id === 'lataria')?.subItems[0]?.photoPath;
    const img1 = await evalJs(`document.querySelector('.rate__photo img')?.getAttribute('src') ?? ''`);
    check('foto tirada: rascunho guarda só o caminho (sem base64) e o arquivo existe', !!path1 && path1.startsWith('fotos/') && !(await prefsBrutos('vetor.inspection-draft')).includes('base64') && (await temArquivo(path1)), path1);
    check('tela mostra a foto lida do arquivo', img1.startsWith('data:image/png;base64,'), img1.slice(0, 40));

    // 2) refazer: a foto antiga é apagada
    await tirarFoto();
    const path2 = (await rascunho())?.steps.find((s) => s.id === 'lataria')?.subItems[0]?.photoPath;
    check('refazer a foto apaga o arquivo anterior', !!path2 && path2 !== path1 && !(await temArquivo(path1)) && (await temArquivo(path2)));

    // 3) rascunho restaurado ao reabrir o app continua mostrando a foto
    await reabrir('/vistoria/avaliar/lataria/0', 1500);
    await evalJs(`[...document.querySelectorAll('.rate-option')].find(b => b.textContent.includes('precisa de atenção')).click()`);
    await sleep(500);
    const img3 = await evalJs(`document.querySelector('.rate__photo img')?.getAttribute('src') ?? ''`);
    check('reabrir o app: foto do rascunho volta do arquivo', img3.startsWith('data:image/png;base64,'), img3.slice(0, 40));

    // 4) sair da conta descarta a vistoria em andamento — e as fotos dela
    await goto(`${APP_MOBILE}/tabs/perfil`);
    await sleep(600);
    await evalJs(`(async () => {
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('sair')).click();
      await new Promise(r => setTimeout(r, 800));
      [...document.querySelectorAll('ion-alert button')].find(b => b.textContent.trim().toLowerCase() === 'sair')?.click();
      await new Promise(r => setTimeout(r, 1000));
    })()`);
    check('logout descarta o rascunho e apaga as fotos dele', (await url()) === '/login' && !(await temArquivo(path2)) && !(await rascunho()), `url=${await url()}`);

    // 5) fila antiga com base64 é convertida em arquivo ao abrir (API fora pra ela continuar na fila)
    await evalJs(`(async () => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name=username]', ${JSON.stringify(MOTORISTA.login)}); set('input[name=password]', 'demo123');
      document.querySelector('button[type=submit]').click();
      await new Promise(r => setTimeout(r, 2500));
    })()`);
    await bloquearApi(true);
    await gravarFila([{
      id: 'e2e-arq-legado', vehicleId: veiculoId, vehiclePlate: 'RTX-4B21', vehicleType: 'carro', owner: MOTORISTA.login,
      startedAt: new Date().toISOString(), createdAt: new Date().toISOString(), hasCriticalAlert: false, hasWarnAlert: true, status: 'queued',
      steps: [{ id: 'lataria', label: 'avarias na lataria', icon: 'car_crash', photoRequirement: 'on-issue', noteOnIssue: true, notePlaceholder: '',
        subItems: [{ label: 'avaria 1', rating: 'atencao', photoDataUrl: PNG, note: 'risco E2E arquivo' }] }],
    }]);
    await reabrir('/tabs', 2500);
    const bruto = await prefsBrutos('vetor.queue');
    const legado = (await fila()).find((i) => i.id === 'e2e-arq-legado');
    const pathLegado = legado?.steps[0].subItems[0].photoPath;
    check('fila antiga (base64): vira arquivo ao abrir, Preferences fica sem base64', legado?.status === 'queued' && !!pathLegado && !bruto.includes('base64') && (await temArquivo(pathLegado)), `status=${legado?.status} path=${pathLegado}`);

    // 6) internet volta: sobe a foto lida do arquivo e apaga o arquivo depois de enviada
    const qtd = arquivos().length;
    await bloquearApi(false);
    await reabrir('/tabs', 4000);
    const enviado = (await fila()).find((i) => i.id === 'e2e-arq-legado');
    const sub = enviado?.steps[0].subItems[0];
    if (sub?.midiaId) midias.add(sub.midiaId);
    check('envio sobe a foto do arquivo pra POST /midia e depois apaga o arquivo', enviado?.status === 'sent' && !!sub?.midiaId && !sub.photoPath && arquivos().length === qtd + 1 && !(await temArquivo(pathLegado)), `status=${enviado?.status} midia=${sub?.midiaId}`);

    // 7) arquivo da foto sumiu: a vistoria vira "error" (não fica tentando pra sempre como se fosse falta de rede)
    await gravarFila([{ ...enviado, id: 'e2e-arq-sumiu', status: 'queued', serverId: null,
      steps: [{ ...enviado.steps[0], subItems: [{ ...sub, midiaId: null, photoPath: 'fotos/nao-existe.png' }] }] }]);
    await reabrir('/tabs', 3000);
    const sumiu = (await fila()).find((i) => i.id === 'e2e-arq-sumiu');
    check('foto sem arquivo -> vistoria vira "error"', sumiu?.status === 'error', `status=${sumiu?.status}`);
  } finally {
    await bloquearApi(false).catch(() => {});
    if (midias.size) sql(`DELETE FROM midias WHERE id IN (${[...midias].map((id) => `'${id}'`).join(',')});`);
    for (const f of arquivos()) if (!antes.has(f)) rmSync(`${UPLOADS}/${f}`);
    // vistorias de teste (clienteId e2e-%) são apagadas pelo limparDadosDeTeste
  }
});
