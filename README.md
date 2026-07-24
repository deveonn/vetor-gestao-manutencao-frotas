# Vetor — Gestão de Frotas

### 🚧 Em desenvolvimento

> **Protótipo de portfólio.** Este repositório é uma versão de estudo/demonstração de um sistema de gestão de frotas. O produto final, em desenvolvimento comercial, é privado e não está aqui — este código existe para demonstrar as decisões de arquitetura, a stack e o padrão de implementação. Dados, credenciais e regras de negócio sensíveis foram omitidos ou substituídos por exemplos.

Sistema de gestão de frotas que adiciona uma camada de operação e manutenção sobre uma plataforma de rastreamento externa. A telemetria (posição, hodômetro) vem de um serviço de rastreamento de terceiros; o Vetor cobre o que a telemetria isolada não resolve: **combustível, manutenção preventiva, pneus, motoristas, custos e vistorias em campo**.

A separação é o ponto central do projeto: o rastreamento diz *onde o veículo está*; o Vetor diz *quanto ele custa, quando precisa de manutenção e em que estado está*.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Decisões de arquitetura](#decisões-de-arquitetura)
- [Como rodar](#como-rodar)
- [Módulos](#módulos)
- [Status](#status)

---

## Arquitetura

Três aplicações em torno de uma API central, que é o único ponto que fala com a plataforma de rastreamento externa.

```
┌─────────────────┐         ┌─────────────────┐
│  App mobile     │         │  Painel web     │
│  (motorista)    │         │  (gestor)       │
│  Ionic/Angular  │         │  Angular        │
└────────┬────────┘         └────────┬────────┘
         │  checklist / fotos        │  gestão / dashboards
         │  (offline-first)          │
         └───────────┬───────────────┘
                     ▼
          ┌─────────────────────┐        ┌──────────────────────┐
          │  API (NestJS)       │───────▶│  Plataforma de       │
          │  regras de negócio  │◀───────│  rastreamento (ext.) │
          │  autenticação       │        │  telemetria/hodômetro│
          └──────────┬──────────┘        └──────────────────────┘
                     │
          ┌──────────▼──────────┐        ┌──────────────────────┐
          │  PostgreSQL/PostGIS │        │  Storage de mídia     │
          │  dados por empresa  │        │  (fotos de vistoria)  │
          └─────────────────────┘        └──────────────────────┘
```

Pontos de desenho:

- **A API é o único cliente da plataforma de rastreamento.** App e painel nunca a acessam direto — isso centraliza autenticação, cache e o tratamento de indisponibilidade do serviço externo num só lugar.
- **O app mobile é offline-first.** O motorista faz vistorias em campo, frequentemente sem sinal; os registros são persistidos localmente e sincronizados quando há conexão.
- **Isolamento por empresa.** Cada registro pertence a uma empresa (`empresa_id`), garantindo que dados de uma empresa nunca vazem para outra na mesma instância.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Painel web | Angular |
| App mobile | Ionic + Angular (Android) |
| Backend | NestJS |
| Banco | PostgreSQL + PostGIS |
| Integração | API REST da plataforma de rastreamento |
| Mídia | Storage de objetos (fotos de vistoria) |

<!-- TODO: preencher versões exatas (Node, Angular, NestJS, Postgres) e gerenciador de pacotes (npm/pnpm/yarn) -->

---

## Estrutura do monorepo

```
.
├── web/         # painel web do gestor (Angular)
├── mobile/      # app de vistoria do motorista (Ionic/Angular)
├── backend/     # API e regras de negócio (NestJS)
└── README.md
```

<!-- TODO: ajustar os nomes das pastas aos reais do repo, se diferentes -->

Cada aplicação tem seu próprio ciclo de build e suas dependências; o repositório as mantém juntas para versionamento e contexto compartilhado.

---

## Decisões de arquitetura

Esta seção existe porque as decisões abaixo são o que o projeto tem de mais interessante do ponto de vista técnico.

### Multi-tenancy por empresa

O sistema serve múltiplas empresas na mesma instância. A empresa é a fronteira de isolamento: toda tabela de domínio (veículos, motoristas, abastecimentos, pneus, vistorias) carrega `empresa_id`, e as consultas são sempre escopadas por ele. A hierarquia de acesso tem três níveis:

- **Root** — provedor do sistema; gerencia as empresas.
- **Admin** — a empresa (dono da frota); enxerga apenas os próprios dados.
- **Motorista** — vinculado a uma empresa; acessa apenas o app.

### Integração isolada com serviço externo

A dependência da plataforma de rastreamento fica contida numa camada de integração no backend. O resto da aplicação consome uma interface interna, não a API externa diretamente. Isso torna o sistema resiliente à indisponibilidade do serviço externo e facilita testar as regras de negócio sem depender dele.

### Sincronização offline-first no mobile

O app trata a ausência de conexão como estado normal, não como erro. As vistorias são gravadas localmente e entram numa fila de sincronização; a interface comunica com clareza o que está pendente de envio. Isso reflete o uso real em campo (pátios, estradas, garagens sem sinal).

### Hodômetro como fonte de verdade compartilhada

O hodômetro vem da telemetria e alimenta tanto o cálculo de consumo (Km/L) quanto os alertas de manutenção preventiva, reduzindo a entrada manual de dados e mantendo os dois módulos consistentes.

---

## Como rodar

> Pré-requisitos: Node.js, PostgreSQL com extensão PostGIS. <!-- TODO: fixar versões -->

Clone o repositório e configure as variáveis de ambiente de cada aplicação a partir dos arquivos de exemplo.

```bash
git clone <url-do-repo>
cd vetor
```

### Backend

```bash
cd backend
npm install
cp .env.example .env      # configure banco, storage e integração
npm run start:dev
```

### Painel web

```bash
cd web
npm install
npm start
```

### App mobile

```bash
cd mobile
npm install
npx cap sync
ionic serve                # ou: npx cap run android
```

<!-- TODO: confirmar os comandos reais (scripts do package.json de cada app), portas e passos de migração do banco -->

### Variáveis de ambiente

Nenhuma credencial real está versionada. Cada app traz um `.env.example` com as chaves esperadas (conexão do banco, storage de mídia, credenciais da integração de rastreamento). Preencha com valores próprios.

---

## Módulos

- **Cadastros** — veículos, motoristas (com CNH e validade), pneus por posição, vínculo motorista/veículo com histórico.
- **Combustível** — registro de abastecimentos, cálculo de Km/L, custo por km, alerta de consumo anômalo.
- **Manutenção preventiva** — controle de troca de óleo por km ou tempo, alertas de vencimento, histórico com custos.
- **Pneus e vistoria** — checklist de vistoria pelo app com foto, estado por posição, sinalização de troca.
- **Dashboards** — custo da frota por período, comparativo entre períodos por categoria, Km/L, alertas ativos.
- **Controle de acesso** — hierarquia root / admin / motorista, com isolamento por empresa.

---

## Status

Protótipo em evolução, para fins de portfólio. Não reflete o estado nem o escopo do produto comercial.

<!-- TODO opcional: adicionar screenshots do painel e do app, badge de licença, e link para o case no portfólio -->

---

## Sobre

Desenvolvido por Émerson como estudo de arquitetura full-stack (Angular · NestJS · Ionic · PostgreSQL/PostGIS), com foco em multi-tenancy, integração com serviços externos e sincronização offline.
