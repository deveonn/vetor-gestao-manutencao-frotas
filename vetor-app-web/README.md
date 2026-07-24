# Vetor — Painel Web

Painel de gestão usado pelo administrador da empresa (dono da frota). É a interface onde o gestor acompanha custos, manutenção, combustível, pneus e vistorias, e recebe os alertas da frota. Consome a API do backend; não acessa a plataforma de rastreamento diretamente.

> Parte do monorepo **Vetor**. Para a visão geral e o diagrama de arquitetura, veja o [README da raiz](../README.md).

---

## Stack

- **Angular** (TypeScript)
- Consome a **API REST** do backend
- Tema dark-first, com sistema de design próprio ("telemetria viva")

<!-- TODO: preencher versões (Angular, Node) e libs relevantes (UI kit, gráficos, gerenciamento de estado) -->

---

## Principais telas

- **Dashboard** — custo da frota por período, comparativo entre períodos por categoria, Km/L, disponibilidade e painel de alertas ativos.
- **Veículos** — lista da frota e ficha detalhada de cada veículo (hodômetro, abastecimentos, manutenção, pneus, motorista).
- **Combustível** — registro de abastecimentos e análise de consumo.
- **Manutenção** — controle de trocas e histórico com custos.
- **Pneus / Vistorias** — pneus sinalizados e vistorias recebidas do app.
- **Motoristas** — cadastro, CNH e vínculo com veículo.

---

## Como rodar

Pré-requisitos: Node.js e o [backend](../backend/README.md) rodando (a interface depende da API). <!-- TODO: fixar versões -->

```bash
npm install
npm start                  # dev server em http://localhost:4200
```

Configure a URL da API nos arquivos de ambiente do Angular (`src/environments/`). <!-- TODO: confirmar como o ambiente aponta para a API -->

### Scripts

```bash
npm start                  # dev server com reload
npm run build              # build de produção
npm run test               # testes unitários
npm run lint               # análise estática
```

<!-- TODO: ajustar aos scripts reais do package.json -->

---

## Estrutura

```
src/
├── app/
│   ├── core/          # serviços singleton, guards, interceptors (auth, API)
│   ├── shared/        # componentes, pipes e diretivas reutilizáveis
│   ├── features/      # módulos por área (dashboard, veículos, combustível, ...)
│   └── layout/        # casca da aplicação (navegação, shell)
├── environments/      # configuração de ambiente (URL da API, flags)
└── assets/            # imagens, ícones, estilos globais
```

<!-- TODO: ajustar à estrutura real do projeto -->

---

## Notas de implementação

- **A autenticação usa o token emitido pelo backend**, anexado às requisições por um interceptor; as rotas são protegidas por guards conforme o perfil.
- **Os dados são sempre da empresa autenticada** — o escopo por empresa é garantido pelo backend; a interface apenas reflete o que a API retorna.

---

> Protótipo de portfólio. O produto comercial é privado e não está neste repositório.
