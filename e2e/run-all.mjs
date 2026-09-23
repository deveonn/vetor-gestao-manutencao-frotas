// Roda todas as suítes em sequência (cada uma sobe o próprio Chrome) e sai com código 1 se alguma falhar.
// Uso: node e2e/run-all.mjs [grupo|suite ...]   ex.: node e2e/run-all.mjs web  ·  node e2e/run-all.mjs veiculos combustivel
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ordem = ordem do checklist (PENDENCIAS_DEPLOY.txt); "web" precisa do painel em :4200, "mobile" do app em :8100
const GRUPOS = {
  web: ['login', 'conta', 'rastreamento', 'veiculos', 'motoristas', 'combustivel', 'manutencao', 'pneus', 'painel'],
  mobile: ['mobile-login'],
};
const args = process.argv.slice(2);
const escolhidas = (args.length ? args : ['web', 'mobile']).flatMap((a) => GRUPOS[a] ?? [a]);

let pass = 0;
let fail = 0;
const falharam = [];
for (const nome of escolhidas) {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(`./${nome}.mjs`, import.meta.url))], { encoding: 'utf8' });
  const saida = (r.stdout ?? '') + (r.stderr ?? '');
  process.stdout.write(saida.endsWith('\n') ? saida : saida + '\n');
  pass += (saida.match(/^PASS /gm) ?? []).length;
  fail += (saida.match(/^(FAIL|ERRO) /gm) ?? []).length;
  if (r.status !== 0) falharam.push(nome);
}

console.log(`\n${pass} PASS · ${fail} FAIL/ERRO${falharam.length ? ' · suítes com falha: ' + falharam.join(', ') : ''}`);
process.exitCode = falharam.length ? 1 : 0;
