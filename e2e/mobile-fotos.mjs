// e2e: app mobile — fotos da vistoria sobem pra POST /midia na sincronização (Mobile #4).
// A câmera não roda em Chrome headless, então a suíte grava vistorias com foto direto na fila local
// (mesmo formato que o app grava) e deixa a sincronização real do app trabalhar. Ver e2e/README.md.
import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOTORISTA, suite } from './lib.mjs';

const UPLOADS = fileURLToPath(new URL('../vetor-backend/uploads', import.meta.url));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const arquivos = () => { try { return readdirSync(UPLOADS); } catch { return []; } };

/**
 * Vistoria na fila com um sub-item de lataria por foto (null = sem foto); `midiaIds` simula fotos já enviadas antes.
 * Usa lataria de propósito: vistoria com "pneus" mexe no estado dos pneus do veículo no servidor.
 */
function vistoria(id, vehicleId, fotos, midiaIds = []) {
  return {
    id, vehicleId, vehiclePlate: 'RTX-4B21', vehicleType: 'carro', owner: MOTORISTA.login, startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), hasCriticalAlert: false, hasWarnAlert: true, status: 'queued',
    steps: [{
      id: 'lataria', label: 'avarias na lataria', icon: 'car_crash', photoRequirement: 'on-issue', noteOnIssue: true, notePlaceholder: '',
      subItems: fotos.map((foto, i) => ({ label: `avaria ${i + 1}`, rating: foto ? 'atencao' : 'ok', photoDataUrl: foto, note: foto ? 'risco E2E' : null, midiaId: midiaIds[i] ?? null })),
    }],
  };
}

await suite('Mobile: fotos da vistoria (Mobile #4)', async ({ API, APP_MOBILE, send, evalJs, goto, check, sleep, sql }) => {
  const antes = new Set(arquivos());
  const midiasCriadas = new Set();
  const fila = () => evalJs(`JSON.parse(localStorage.getItem('CapacitorStorage.vetor.queue') || '[]')`);
  const item = async (id) => (await fila()).find((i) => i.id === id);
  const gravarFila = (itens) => evalJs(`localStorage.setItem('CapacitorStorage.vetor.queue', ${JSON.stringify(JSON.stringify(itens))})`);
  /** Recarrega o app (a sincronização começa sozinha ao abrir com rede) e espera `ms`. */
  const reabrir = async (ms) => { await goto(`${APP_MOBILE}/tabs`); await sleep(ms); };
  const bloquearApi = (sim) => send('Network.setBlockedURLs', { urls: sim ? [`${API}/*`] : [] });
  const anotar = (it) => it?.steps.flatMap((s) => s.subItems).forEach((x) => x.midiaId && midiasCriadas.add(x.midiaId));
  await send('Network.enable');

  try {
    // login real do motorista (a fila só sincroniza com token)
    await goto(`${APP_MOBILE}/login`);
    await evalJs('localStorage.clear()');
    await goto(`${APP_MOBILE}/login`);
    await sleep(1500);
    await evalJs(`(async () => {
      const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name=username]', ${JSON.stringify(MOTORISTA.login)}); set('input[name=password]', ${JSON.stringify(MOTORISTA.senha)});
      document.querySelector('button[type=submit]').click();
      await new Promise(r => setTimeout(r, 2500));
    })()`);

    const veiculoId = JSON.parse(await evalJs(`localStorage.getItem('CapacitorStorage.vetor.veiculo-do-dia')`)).id;

    // 1) com rede: vistoria com 2 fotos + vistoria sem foto
    await gravarFila([vistoria('e2e-a', veiculoId, [PNG, PNG]), vistoria('e2e-b', veiculoId, [null, null])]);
    await reabrir(6000);
    const a = await item('e2e-a');
    const b = await item('e2e-b');
    anotar(a);
    const idsA = a.steps[0].subItems.map((x) => x.midiaId);
    const novos = arquivos().filter((f) => !antes.has(f));
    check('com rede: as 2 fotos sobem, cada sub-item guarda seu midiaId e a vistoria fica "sent"', a.status === 'sent' && idsA.every(Boolean) && new Set(idsA).size === 2 && novos.length === 2, `status=${a.status} ids=${idsA} arquivos=${novos.length}`);
    check('vistoria sem foto não sobe nada e também é enviada', b.status === 'sent' && b.steps[0].subItems.every((x) => !x.midiaId));
    const servido = await fetch(`${API.replace(/\/api$/, '')}/uploads/${novos[0]}`);
    check('foto enviada é servida pela API em /uploads', servido.status === 200 && (servido.headers.get('content-type') ?? '').startsWith('image/png'), `${servido.status} ${servido.headers.get('content-type')}`);

    // 2) API fora do ar: volta pra fila sem virar erro e sem subir nada
    const qtdAntes = arquivos().length;
    await gravarFila([vistoria('e2e-c', veiculoId, [PNG])]);
    await bloquearApi(true);
    await reabrir(4000);
    let c = await item('e2e-c');
    check('API inacessível: vistoria continua "queued" (não vira erro) e nenhuma foto sobe', c.status === 'queued' && !c.steps[0].subItems[0].midiaId && arquivos().length === qtdAntes, `status=${c.status}`);
    await bloquearApi(false);
    await reabrir(4000);
    c = await item('e2e-c');
    anotar(c);
    check('API volta: ao reabrir, a mesma vistoria sincroniza', c.status === 'sent' && !!c.steps[0].subItems[0].midiaId && arquivos().length === qtdAntes + 1);

    // 3) retomada: foto que já tinha midiaId (envio anterior interrompido) não sobe de novo
    const jaEnviada = idsA[0];
    const qtd3 = arquivos().length;
    await gravarFila([vistoria('e2e-d', veiculoId, [PNG, PNG], [jaEnviada])]);
    await reabrir(4000);
    const d = await item('e2e-d');
    anotar(d);
    check('retomada: só a foto sem midiaId sobe; a outra mantém o id que já tinha', d.status === 'sent' && d.steps[0].subItems[0].midiaId === jaEnviada && !!d.steps[0].subItems[1].midiaId && arquivos().length === qtd3 + 1);

    // 4) servidor recusa (arquivo que não é imagem): vira "error", pra o motorista tentar de novo
    await gravarFila([vistoria('e2e-e', veiculoId, ['data:text/plain;base64,aGVsbG8='])]);
    await reabrir(3000);
    const e = await item('e2e-e');
    check('servidor recusa o arquivo (400) -> vistoria vira "error"', e.status === 'error' && !e.steps[0].subItems[0].midiaId, `status=${e.status}`);
  } finally {
    await bloquearApi(false).catch(() => {});
    if (midiasCriadas.size) sql(`DELETE FROM midias WHERE id IN (${[...midiasCriadas].map((id) => `'${id}'`).join(',')});`);
    for (const f of arquivos()) if (!antes.has(f)) rmSync(`${UPLOADS}/${f}`);
  }
});
