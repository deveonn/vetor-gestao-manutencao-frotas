# Vetor — App Mobile (Vistoria)

Aplicativo Android usado pelo motorista em campo para fazer a vistoria do veículo e registrar o estado dos pneus com fotos. É a ponta de captura de dados do sistema: o que o motorista registra aqui alimenta o painel do gestor. Projetado para uso offline — o motorista frequentemente está sem sinal.

> Parte do monorepo **Vetor**. Para a visão geral e o diagrama de arquitetura, veja o [README da raiz](../README.md).

---

## Stack

- **Ionic + Angular** (TypeScript)
- **Capacitor** — build nativo Android e acesso a câmera, storage e rede
- Consome a **API REST** do backend

<!-- TODO: preencher versões (Ionic, Angular, Capacitor, Node) e plugins usados -->

---

## Principais fluxos

- **Login** do motorista, com suporte a trabalho offline.
- **Home** — veículo vinculado do dia, iniciar vistoria, status de sincronização.
- **Checklist de vistoria** — itens configuráveis (pneus, óleo, luzes, freios, avarias) com marcação de estado e foto.
- **Vistoria de pneu com câmera** — captura da foto e marcação de estado por posição; "trocar" vira um alerta para o gestor.
- **Revisão e envio** — resumo antes de finalizar; se offline, fica na fila de sincronização.
- **Histórico** — vistorias feitas, com estado de envio (enviada / pendente).

---

## Offline-first

A ausência de conexão é tratada como estado normal, não como erro. As vistorias são gravadas localmente e entram numa fila de sincronização, enviadas quando há conexão. A interface comunica com clareza quantos registros estão pendentes. Este é o requisito central do app e reflete o uso real em pátios, estradas e garagens sem sinal.

<!-- TODO: descrever a estratégia real de persistência local (ex. Capacitor Preferences, SQLite, IndexedDB) e de fila de sincronização -->

---

## Como rodar

Pré-requisitos: Node.js, Ionic CLI, e o [backend](../backend/README.md) acessível. Para build nativo: Android Studio + SDK. <!-- TODO: fixar versões -->

```bash
npm install

# no navegador (desenvolvimento rápido)
ionic serve

# sincroniza o projeto nativo e roda no Android
npx cap sync
npx cap run android
```

Configure a URL da API nos arquivos de ambiente (`src/environments/`). <!-- TODO: confirmar -->

### Scripts

```bash
ionic serve                # dev no navegador
npm run build              # build web
npx cap sync               # copia build + plugins para o projeto nativo
npx cap open android       # abre no Android Studio
```

<!-- TODO: ajustar aos scripts reais do package.json -->

---

## Ícones e splash (Capacitor Assets)

Os ícones e a splash são gerados a partir de uma imagem-fonte única com o `@capacitor/assets`. O source (1024×1024, fundo sólido, sem transparência) fica versionado; os arquivos derivados por plataforma são gerados por comando e ignorados pelo Git.

```bash
# a partir de assets/ com icon.png (1024x1024) e splash.png (2732x2732)
npx @capacitor/assets generate --android
```

<!-- TODO: confirmar o caminho da pasta de assets e as imagens-fonte -->

---

## Estrutura

```
src/
├── app/
│   ├── core/          # serviços (auth, API, sincronização offline)
│   ├── shared/        # componentes e utilitários reutilizáveis
│   ├── pages/         # telas (login, home, checklist, câmera, histórico)
│   └── ...
├── environments/      # configuração de ambiente (URL da API)
└── assets/            # imagens e recursos, incluindo os sources de ícone/splash
android/               # projeto nativo Android (Capacitor)
```

<!-- TODO: ajustar à estrutura real do projeto -->

---

## Notas de implementação

- **Permissão de câmera** é solicitada no momento da primeira vistoria; o app trata o caso de permissão negada.
- **Sincronização** roda ao recuperar conexão; registros pendentes ficam visíveis para o motorista até serem confirmados.
- **Vínculo motorista/veículo** define o contexto da vistoria; o motorista só registra o veículo ao qual está vinculado.

---

> Protótipo de portfólio. O produto comercial é privado e não está neste repositório.
