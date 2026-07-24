# Vetor — Backend (API)

API central do sistema de gestão de frotas. Concentra as regras de negócio, a autenticação, o isolamento de dados por empresa e a integração com a plataforma de rastreamento externa. É o único componente que conversa com o serviço de rastreamento — o painel web e o app mobile falam apenas com esta API.

> Parte do monorepo **Vetor**. Para a visão geral e o diagrama de arquitetura, veja o [README da raiz](../README.md).

---

## Stack

- **NestJS** (Node.js + TypeScript)
- **PostgreSQL + PostGIS** — dados relacionais e consultas geoespaciais
- **API REST** — consumida pelo web e pelo mobile
- Integração com a plataforma de rastreamento via camada dedicada

<!-- TODO: preencher versões (Node, NestJS, Postgres) e ORM/query builder usado (TypeORM, Prisma, Knex...) -->

---

## Responsabilidades

- **Autenticação e autorização** por perfil: root, admin (empresa), motorista.
- **Isolamento multi-tenant** — toda consulta de domínio é escopada por `empresa_id`.
- **Regras de negócio** — cálculo de Km/L, alertas de manutenção e de consumo anômalo, controle de vistorias.
- **Integração de rastreamento** isolada numa camada própria, para que o resto da aplicação não dependa diretamente do serviço externo.
- **Persistência** de dados e metadados de mídia (as fotos em si vão para o storage de objetos).

---

## Como rodar

Pré-requisitos: Node.js e uma instância PostgreSQL com a extensão PostGIS habilitada. <!-- TODO: fixar versões -->

```bash
npm install
cp .env.example .env       # configure banco, storage e integração
npm run start:dev          # desenvolvimento, com hot reload
```

A API sobe por padrão em `http://localhost:3000`. <!-- TODO: confirmar porta real -->

### Scripts

```bash
npm run start:dev          # dev com watch
npm run build              # build de produção
npm run start:prod         # roda o build
npm run test               # testes unitários
npm run test:e2e           # testes end-to-end
npm run lint               # análise estática
```

<!-- TODO: ajustar aos scripts reais do package.json -->

### Migrações

```bash
# TODO: preencher os comandos reais de migração conforme o ORM escolhido
# ex. (TypeORM):  npm run migration:run
# ex. (Prisma):   npx prisma migrate dev
```

---

## Variáveis de ambiente

Todas as chaves esperadas estão em `.env.example`. Nenhuma credencial real é versionada. Grupos principais:

| Grupo | Descrição |
|---|---|
| Banco | host, porta, usuário, senha, database do PostgreSQL |
| Auth | segredo de assinatura de token, expiração |
| Rastreamento | URL base e credenciais da API da plataforma externa |
| Storage | endpoint e credenciais do storage de mídia |

<!-- TODO: listar as chaves exatas do seu .env.example -->

---

## Estrutura

```
src/
├── modules/        # módulos de domínio (veículos, combustível, manutenção, ...)
├── common/         # guards, interceptors, filtros, decorators compartilhados
├── integrations/   # camada de integração com a plataforma de rastreamento
├── config/         # configuração e carregamento de ambiente
└── main.ts         # bootstrap da aplicação
```

<!-- TODO: ajustar à estrutura real do projeto -->

---

## Notas de implementação

- **A integração externa fica contida.** O restante do código consome uma interface interna, não a API de rastreamento diretamente. Isso mantém as regras de negócio testáveis sem depender do serviço externo e torna o sistema resiliente à indisponibilidade dele.
- **`empresa_id` é obrigatório** nas entidades de domínio e aplicado no nível de consulta, não apenas na interface — é a garantia de que dados de uma empresa não vazem para outra.

---

> Protótipo de portfólio. O produto comercial é privado e não está neste repositório.
