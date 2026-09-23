# Testes e2e (painel web + API)

Cada suíte abre o `vetor-app-web` num Chrome headless, dirigido pelo DevTools Protocol, e confere a tela contra a API real: o que aparece, o que é gravado e os cálculos (km/L, alertas, KPIs, relatórios). Não há dependências npm, só Node ≥ 22 (que já traz `fetch` e `WebSocket`).

Nasceram da migração do painel do mock pra API (Web #1–#10 em `PENDENCIAS_DEPLOY.txt`) e servem de ponto de partida pro backend #6, testes automatizados.

## Pré-requisitos

1. Postgres de pé e banco com seed (`vetor-backend`: `docker compose up -d`, `npx prisma migrate dev`, `npm run prisma:seed`).
2. API rodando em `http://localhost:3000/api` (`npm run start:dev` no `vetor-backend`).
3. Painel rodando em `http://localhost:4200` **em modo dev** (`npm start` no `vetor-app-web`). A suíte `painel` lê os dados do gráfico via `ng.getComponent`, que só existe em modo dev.
4. `google-chrome` no PATH, ou `CHROME_BIN` apontando pro binário.

## Rodar

```bash
node e2e/run-all.mjs                      # todas, na ordem do checklist
node e2e/run-all.mjs veiculos combustivel  # só algumas
node e2e/veiculos.mjs                      # uma suíte direto
```

A saída tem uma linha `PASS`/`FAIL` por cenário e um total no fim. O código de saída é 1 se algo falhar.

Variáveis opcionais: `APP_URL`, `API_URL`, `CHROME_BIN`, `CDP_PORT` (padrão 9333).

## Dados de teste

As suítes escrevem no banco de desenvolvimento de verdade, então:

- tudo que elas criam usa prefixos reconhecíveis (`TST-` em placas, `Teste E2E` em motoristas, `Posto E2E` em fornecedores), e `lib.mjs` apaga esses registros ao fim de cada suíte, passando ou não;
- o que elas alteram em dados do seed (manutenção concluída, vistoria enviada, abastecimento extra) é revertido no `finally` da própria suíte.

Depois de uma rodada completa, o banco volta ao estado do seed. **Não rode contra um banco com dados que importam.**

## Estrutura

- `lib.mjs`: sobe o Chrome, conecta via CDP e expõe `suite(nome, corpo)`. O contexto passado ao `corpo` traz `goto`, `evalJs`, `texto`, `loginAdmin`, `api` (usa o token da sessão do navegador), `sql` (via `prisma db execute` do backend) e `check(cenario, ok, extra)`.
- Uma suíte por módulo do painel: `login`, `conta`, `rastreamento`, `veiculos`, `motoristas`, `combustivel`, `manutencao`, `pneus`, `painel`.
- `run-all.mjs`: roda as suítes em sequência e soma os resultados.
