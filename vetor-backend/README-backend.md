# Vetor — Backend (API)

API central do sistema de gestão de frotas. Concentra as regras de negócio, a autenticação, o isolamento de dados por empresa e a integração com a plataforma de rastreamento externa. É o único componente que conversa com o serviço de rastreamento — o painel web e o app mobile falam apenas com esta API.

> Parte do monorepo **Vetor**. Para a visão geral e o diagrama de arquitetura, veja o [README da raiz](../README.md). O contrato completo de endpoints (o que gerou este backend) está em [`/endpoints.md`](../endpoints.md).

---

## Stack

- **NestJS 11** (Node.js 24 + TypeScript 5.9)
- **Prisma 6** como ORM, sobre **PostgreSQL + PostGIS**
- **JWT** (access + refresh token) via `@nestjs/jwt` / `passport-jwt`, com bcrypt pro hash de senha
- **Swagger** (`@nestjs/swagger`) documentando todas as rotas automaticamente
- Integração com a plataforma de rastreamento via camada dedicada (`src/integracao-rastreamento`) — hoje só a conexão/token são reais, a chamada de fato ao serviço externo ainda não existe (ver comentário em `integracao-rastreamento.service.ts`)

---

## Responsabilidades

- **Autenticação e autorização** por perfil: root, admin (empresa), motorista — um único endpoint de login (`POST /auth/login`), diferenciado pelo usuário encontrado, não pela rota.
- **Isolamento multi-tenant** — toda consulta de domínio é escopada por `empresaId`, lido do JWT, nunca de path/query.
- **Regras de negócio** — cálculo de km/L a cada abastecimento, sinalização de consumo anômalo, atualização do resumo de pneus a partir de vistorias.
- **Persistência** de dados e metadados de mídia (as fotos em si ficam em disco local em dev — ver `UPLOADS_DIR`).

---

## Como rodar

Pré-requisitos: Node.js 24+, e um Postgres com PostGIS (o `docker-compose.yml` do próprio diretório sobe um).

```bash
docker compose up -d               # sobe o Postgres+PostGIS local (porta 5432)
npm install
cp .env.example .env               # ajuste os segredos de JWT se quiser
npx prisma migrate dev --name init # cria as tabelas
npm run prisma:seed                # popula com os dados usados pelo painel web em desenvolvimento
npm run start:dev                  # dev com watch
```

A API sobe em `http://localhost:3000/api`. Documentação interativa (Swagger) em `http://localhost:3000/api/docs` — dá pra autenticar com `POST /auth/login` e testar o resto direto pelo navegador, sem precisar integrar nenhum frontend ainda.

### Login de teste (após o seed)

| Papel | Login | Senha |
|---|---|---|
| root | `root@vetor.dev` | `demo123` |
| admin | `rui@transportesalmeida.com.br` | `demo123` |
| motorista | `joao.prates`, `carla.nunes`, `marcos.teixeira`, ... (um por motorista seedado) | `demo123` |

### Scripts

```bash
npm run start:dev          # dev com watch
npm run build               # build de produção (nest build)
npm run start:prod          # roda o build (dist/main.js)
npm run prisma:generate     # regenera o Prisma Client após mudar o schema
npm run prisma:migrate      # cria/aplica uma migration em dev
npm run prisma:deploy       # aplica migrations pendentes (produção/CI)
npm run prisma:studio       # abre o Prisma Studio (GUI do banco)
npm run prisma:seed         # cenário demo num banco vazio (com dados, é ignorado — em dev: npx prisma migrate reset)
```

npm test                    # testes de unidade (Jest, em test/): urgência das manutenções, status/troca de óleo dos veículos, km/L e consumo anômalo, validação de ambiente

Os testes de ponta a ponta (API + painel + app no navegador, inclusive o isolamento entre empresas) ficam em `/e2e` na raiz — ver `e2e/README.md`. O CI (`.github/workflows/ci.yml`) roda build + `npm test` dos três projetos e depois a suíte e2e inteira num Postgres novo. Não há linter configurado.

### Migrações

Prisma Migrate. `npx prisma migrate dev --name <descrição>` cria uma nova migration a partir do diff do `prisma/schema.prisma`; `npm run prisma:deploy` aplica migrations existentes sem gerar novas (uso em CI/produção).

---

## Variáveis de ambiente

Todas em `.env.example`, sem credencial real versionada:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | connection string do Postgres (o `docker-compose.yml` local usa `vetor`/`vetor`/`vetor`) |
| `PORT` | porta da API (default 3000) |
| `NODE_ENV` | `production` liga as validações rígidas de ambiente |
| `CORS_ORIGIN` | origens permitidas, separadas por vírgula (obrigatória em produção) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | segredo e validade do access token (produção: 32+ caracteres) |
| `JWT_REFRESH_EXPIRES_IN` | validade do refresh token (opaco, guardado com hash no banco — não é JWT, não tem segredo) |
| `LOGIN_LIMITE_POR_MINUTO` | tentativas de `POST /auth/login` por IP por minuto (padrão 10; alto no `.env` de dev por causa dos e2e) |
| `STORAGE_DRIVER` | `local` (disco em `UPLOADS_DIR`, servido em `/uploads`) ou `s3` (bucket S3-compatível) |
| `UPLOADS_DIR` / `UPLOADS_PERSISTENTE` | disco local; em produção só com volume persistente e `UPLOADS_PERSISTENTE=true` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_PUBLIC_URL` / `S3_FORCE_PATH_STYLE` | bucket das fotos com `STORAGE_DRIVER=s3` (Cloudflare R2, AWS S3, MinIO) |

A API não sobe se faltar algo obrigatório (`src/config/env.validation.ts`): sem `DATABASE_URL`/`JWT_SECRET` sempre; em produção também sem `CORS_ORIGIN`, com segredo fraco ou de exemplo, ou com fotos em disco sem volume persistente.

---

## Produção

- **Render:** `render.yaml` na raiz do repositório é a blueprint do serviço (`New > Blueprint`): Docker, plano free, região virginia (perto do Neon us-east-1), health check em `/api/health`, só redeploya quando `vetor-backend/` muda. `JWT_SECRET` é gerado pelo Render; banco e credenciais do R2 (`sync: false`) são pedidos na criação.
- **Imagem:** `Dockerfile` (contexto `vetor-backend/`). Na subida roda `prisma migrate deploy` e depois `node dist/main` — por isso o CLI `prisma` está em `dependencies`. Escuta em `0.0.0.0:$PORT`.
- **Banco:** Postgres **com a extensão PostGIS disponível** (a migration inicial roda `CREATE EXTENSION postgis`; Neon e Supabase têm). Nenhuma tabela usa geometria ainda — a extensão está lá pra rastreamento.
- **Fotos:** `STORAGE_DRIVER=s3` com um bucket de acesso público de leitura (ex.: Cloudflare R2 com URL pública `r2.dev` ou domínio). Chave `midia/<empresaId>/<uuid>.<ext>`; o banco guarda a URL pública absoluta.
- **Dados:** `npm run prisma:seed` com o `DATABASE_URL` de produção cria o cenário demo (senha `demo123` pra todos) — só num banco vazio.
- **Health check:** `GET /api/health` faz `SELECT 1` no banco (503 se o banco cair).
- **Segurança:** login limitado por IP (`LOGIN_LIMITE_POR_MINUTO`, 429 com mensagem em português), `trust proxy` ligado (IP real atrás do proxy da hospedagem), desligamento limpo no SIGTERM (`enableShutdownHooks`). O Swagger (`/api/docs`) continua público.
- **Dependências:** `npm audit --omit=dev` em 05/10/2026 deixa 3 avisos não exploráveis pela internet — `prisma` (via `deepmerge-ts`, só na CLI de migration) e `@nestjs/swagger` (via `js-yaml`, só gera o documento). A correção do swagger é a major 12.

---

## Estrutura

```
prisma/
├── schema.prisma     # todas as entidades — cada modelo comenta de qual mock (web/mobile) ele vem
└── seed.ts           # popula um banco vazio com os dados do mock do painel web

src/
├── main.ts                     # bootstrap: prefixo /api, CORS, ValidationPipe, Swagger, static /uploads (storage local)
├── config/                      # validação do ambiente na subida
├── storage/                     # StorageService: fotos no disco (dev) ou num bucket S3-compatível
├── app.module.ts                # raiz — registra todos os módulos + guards globais
├── prisma/                      # PrismaService/PrismaModule (global)
├── common/
│   ├── decorators/               # @Public, @Roles, @CurrentUser
│   ├── guards/                   # JwtAuthGuard e RolesGuard (globais, via APP_GUARD)
│   └── types/                    # JwtPayload
├── auth/                         # login, refresh (rotativo), logout, me
├── empresas/                     # GET/PATCH /empresa
├── integracao-rastreamento/      # status/conectar/testar/remover token de rastreamento
├── veiculos/                     # CRUD + vínculos + GET /motorista/veiculo-do-dia
├── motoristas/
├── fornecedores/
├── abastecimentos/               # cálculo de km/L e sinalização de consumo anômalo
├── manutencoes/                  # pendentes/histórico/planos/concluir
├── vistorias/                    # POST atualiza o resumo de pneus do veículo
├── midia/                        # upload de foto (multipart → StorageService)
├── dashboard/                    # resumo, alertas (computados, não persistidos) e custo semanal
└── relatorios/                   # comparativos de categoria e custo por veículo
```

Cada controller/service tem só os endpoints que estão em `/endpoints.md` — não foi criado nada além do que os dois frontends (mock) realmente precisam.

---

## Notas de implementação

- **`empresaId` é obrigatório** nas entidades de domínio e aplicado no nível de query em todo service, não apenas na interface — é a garantia de que dados de uma empresa não vazem para outra. Vem sempre do JWT (`@CurrentUser()`), nunca de parâmetro de rota.
- **Alertas não são uma tabela.** `GET /dashboard/alertas` computa na hora a partir de manutenção pendente, pneus sinalizados, CNH vencendo e abastecimentos anômalos — evita duplicar estado que já existe em outra tabela.
- **`TipoVeiculo`** unifica duas classificações que só existiam nos mocks dos frontends: a do painel web (Utilitário/Van de carga/Caminhão leve) e a do app mobile (carro/van/caminhão, usada pra escolher o diagrama de posições de pneu). Ver comentário em `schema.prisma`.
- **"Pneus" não tem custo próprio.** Os relatórios de comparativo de categoria (`/relatorios/categorias-*`) só têm Combustível e Manutenção — o mock original tinha 3 categorias fixas, mas não existe uma entidade de custo de pneu separada; uma troca de pneu registrada vira um item de `Manutencao` normal.
- **`km` em relatórios de custo por veículo é aproximado** por `MAX(hodômetro) − MIN(hodômetro)` entre os abastecimentos do período — é a única leitura de hodômetro que existe sem a integração de rastreamento real conectada.
- **Upload de mídia** passa pelo `StorageService`: disco local em dev (`UPLOADS_DIR`, servido em `/uploads`), bucket S3-compatível em produção (`STORAGE_DRIVER=s3`). As fotos são públicas pra quem tiver a URL (nome aleatório) — URL assinada fica pra depois.
- **Vínculo motorista↔veículo.** `GET /veiculos/:id/vinculos` lê o histórico; `POST /veiculos/:id/vinculos` (body: `{ motoristaId }`) encerra o vínculo aberto atual (se houver, marcando `ate`) e cria um novo, atualizando `veiculo.motoristaAtualId` — mutação que não existia no mock original.

---

> Protótipo de portfólio. O produto comercial é privado e não está neste repositório.
