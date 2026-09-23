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
npm run prisma:seed         # roda prisma/seed.ts de novo (não é idempotente — banco limpo antes)
```

Não há `test`/`test:e2e`/`lint` ainda — o projeto não tem suíte de testes nem linter configurado.

### Migrações

Prisma Migrate. `npx prisma migrate dev --name <descrição>` cria uma nova migration a partir do diff do `prisma/schema.prisma`; `npm run prisma:deploy` aplica migrations existentes sem gerar novas (uso em CI/produção).

---

## Variáveis de ambiente

Todas em `.env.example`, sem credencial real versionada:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | connection string do Postgres (o `docker-compose.yml` local usa `vetor`/`vetor`/`vetor`) |
| `PORT` | porta da API (default 3000) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | segredo e validade do access token |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | reservado pro refresh token (hoje o refresh token é opaco e guardado com hash no banco, não é um JWT — o segredo fica pra uma eventual migração pra refresh token assinado) |
| `UPLOADS_DIR` | pasta local onde `POST /midia` salva fotos de vistoria em dev |

---

## Estrutura

```
prisma/
├── schema.prisma     # todas as entidades — cada modelo comenta de qual mock (web/mobile) ele vem
└── seed.ts           # popula um banco vazio com os dados do mock do painel web

src/
├── main.ts                     # bootstrap: prefixo /api, CORS, ValidationPipe, Swagger, static /uploads
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
├── midia/                        # upload de foto (multipart → disco local)
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
- **Upload de mídia é local em dev** (`UPLOADS_DIR`, servido em `/uploads`). Trocar por storage de objetos (S3-compatible) antes de qualquer uso além do próprio ambiente de desenvolvimento.
- **Vínculo motorista↔veículo.** `GET /veiculos/:id/vinculos` lê o histórico; `POST /veiculos/:id/vinculos` (body: `{ motoristaId }`) encerra o vínculo aberto atual (se houver, marcando `ate`) e cria um novo, atualizando `veiculo.motoristaAtualId` — mutação que não existia no mock original.

---

> Protótipo de portfólio. O produto comercial é privado e não está neste repositório.
