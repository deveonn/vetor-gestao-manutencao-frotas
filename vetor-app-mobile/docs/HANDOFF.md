# Handoff: App de vistoria de frota (motorista) — Vetor

## Overview
App móvel Android usado pelo **motorista** para fazer a vistoria/checklist do veículo e registrar o estado dos pneus com fotos. É a ponta de captura de dados de um sistema maior de gestão de frota: o que o motorista registra aqui alimenta o painel do gestor. Requisitos centrais: **funciona offline** (sincroniza depois), **alvos de toque grandes** (uso com luva/pressa), **alto contraste** (leitura sob sol), linguagem simples para usuários de qualquer idade.

Este handoff cobre o **fluxo ponta a ponta** do turno 3 do protótipo (11 telas), que é a direção aprovada: layout simplificado, "uma coisa por tela", linguagem falada.

## About the design files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é **recriar estes designs no ambiente-alvo** — **Ionic + Angular + Capacitor** — usando os componentes e padrões dessa stack (`ion-*`, roteamento Angular, serviços, RxJS). O HTML aqui existe só para comunicar visual, copy e fluxo.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento, ícones e copy são finais. Recrie a UI fielmente com os componentes do Ionic estilizados via CSS custom properties / variáveis do tema. Onde o protótipo desenha um placeholder (foto de pneu/van), o app usa a foto real da câmera.

---

## Stack alvo e mapeamento

| Papel | Escolha |
|---|---|
| UI / navegação | Ionic 8 + Angular (standalone components) |
| Nativo | Capacitor — `@capacitor/camera`, `@capacitor/network`, `@capacitor/preferences`/SQLite, `@capacitor/haptics`, `@capacitor/status-bar` |
| Estado | Serviços Angular + RxJS (`BehaviorSubject`) ou signals |
| Offline | Fila local persistida (SQLite ou Preferences) + sync ao voltar a rede |

Mapeamento sugerido de componentes:
- Telas → páginas roteadas (`app-splash`, `app-login`, `app-home`, `app-confirm-vehicle`, `app-camera-permission`, `app-checklist`, `app-tire-camera`, `app-tire-rate`, `app-review`, `app-confirmation`, `app-history`).
- Barra inferior (início / histórico / perfil) → `ion-tabs` envolvendo home e histórico. Splash, login, e o fluxo de vistoria ficam **fora** das tabs (rotas full-screen).
- Botões grandes primários → `ion-button` `size="large"` com `--border-radius`, `min-height` custom.
- Cards de checklist/histórico → `ion-item`/`div` estilizado (não usar `ion-list` padrão, o visual é de card).
- Câmera → `Camera.getPhoto()` do Capacitor (não recriar viewfinder do zero, exceto se quiserem UI custom com preview — ver seção 7).
- Toasts/confirmações → `ion-toast` / `ion-alert`.
- Haptics em cada marcação → `Haptics.impact({ style: ImpactStyle.Medium })`.

---

## Design tokens

### Cores (hex nomeados — reaproveitados do painel web Vetor)
```
--bg:      #0d1320   /* fundo base (grafite azul-noite) */
--bg-deep: #0a0e16   /* fundo do desk/canvas, mais escuro que a tela */
--surf:    #151d2c   /* superfície de card */
--surf-2:  #1c2638   /* superfície elevada / chip */
--surf-3:  #111826   /* card desabilitado/pendente */
--line:    #26334a   /* borda padrão */
--line-2:  #33425f   /* borda mais clara / grab handle */
--brand:   #5cb3ff   /* marca — ações primárias, foco, "próximo" */
--brand-ink:#06121f  /* texto sobre botão de marca */
--brand-deep:#0f3f7a /* fundo do ícone/logo */

/* estados (sempre com ícone + texto, nunca cor sozinha) */
--ok:   #2fd08a   /* em dia / está bom */
--warn: #f5b23d   /* atenção */
--crit: #ff5d52   /* trocar / crítico */

/* texto */
--text:      #e9eef7   /* primário */
--text-2:    #a9b6c9   /* secundário */
--text-mut:  #6b7a92   /* terciário / legendas mono */

/* fundos suaves de estado (chips, banners) */
ok-soft:   rgba(47,208,138,.12–.16)   borda rgba(47,208,138,.35)
warn-soft: rgba(245,178,61,.10–.12)   borda rgba(245,178,61,.30)
crit-soft: rgba(255,93,82,.10–.16)    borda rgba(255,93,82,.35)
brand-soft:rgba(92,179,255,.14–.16)   borda rgba(92,179,255,.15–.30)
```
Máx. 1–2 fundos por tela. Cor de estado **sempre** acompanhada de ícone + palavra (daltonismo / sol forte).

### Tipografia (Google Fonts)
- **Saira** (500/600/700) — títulos técnicos, rótulos de estado, marca. `letter-spacing` leve (~.2–.3px) em títulos.
- **IBM Plex Sans** (400/500/600) — corpo, instruções do checklist, copy em geral. É a face dominante das telas simplificadas.
- **IBM Plex Mono** (400/500) — números tabulares: placa, km/hodômetro, horários, contadores de fila, versão.

Escala usada (px, mobile 360×740):
```
título de tela grande:   24–26 / weight 600 / Plex Sans
título de card:          16–19 / 600 / Plex Sans
pergunta do passo:       22–24 / 600 / Plex Sans
corpo/instrução:         14–16 / 500 / Plex Sans
legenda:                 12.5–13 / 500 / Plex Sans
mono (placa/números):    13–26 / 500–700 / Plex Mono
rótulo de estado:        11–15 / 600 / Saira ou Plex Sans
marca/splash:            34 / 700 / Saira
```
Piso: nada abaixo de 12.5px; texto de leitura em movimento ≥14px.

### Ícones
**Material Symbols Outlined** (weight 300, `FILL 0` por padrão; `FILL 1` para estados preenchidos — check_circle, warning, cancel, history/home ativos). Ícones usados: `sensors, arrow_back, arrow_forward, chevron_right, wifi_off, wifi, battery_5_bar, check, check_circle, warning, cancel, campaign, schedule, sync, photo_camera, add_a_photo, photo_library, refresh, close, flash_on, help, badge→person, lock, visibility, airport_shuttle, swap_horiz, speed, opacity, lightbulb, radio_button_unchecked, trip_origin, home, person, assignment_turned_in, task_alt`.

### Forma / elevação
```
raio card:            14–18px
raio botão grande:    16–22px
raio input/chip:      10–16px
raio bezel do device: (só protótipo) 34–44px
sombra botão marca:   0 10px 24px rgba(92,179,255,.30)
sombra botão crítico: 0 10px 24px rgba(255,93,82,.30)
sombra card flutuante:0 12px 28px rgba(92,179,255,.32) (botão hero)
```

### Alvos de toque e espaçamento
- Botão primário hero: **84px** altura (home). Botões de ação: **58–64px**. Ícone-botão (voltar, flash): **48×48px**. **Nenhum alvo < 48px.**
- Padding lateral de tela: 16px (cards) / 20px (títulos).
- Gap entre cards de lista: 10px. Gap entre botões empilhados: 11px.
- Barra de progresso: 6–10px de altura, raio 3–5px.

### Movimento
- Respeitar `prefers-reduced-motion` (desligar animações). No Ionic: checar via `window.matchMedia` e/ou CSS.
- Microfeedback obrigatório: haptic + mudança visual imediata ao marcar ok/atenção/trocar.
- Pulso suave (opacity 1→.45→1, ~2.4s) em elementos "faça isto agora" (mostrador a preencher, ícone de sync em andamento).
- Cursor/caret piscando no input focado (1s steps).

---

## Telas / Views

> Ordem de navegação: 1 Splash → 2 Login → 3 Home → 4 Confirmar veículo → 5 Permissão câmera → 6 Checklist → (7 Câmera → 8 Avaliar pneu, repetido por item com foto) → 6 Checklist → 9 Revisão → 10 Confirmação → 3 Home. 11 Histórico via tab.

### 1. Splash (`app-splash`)
- **Propósito**: carregar identidade + inicializar (checar sessão, rede, abrir DB local).
- **Layout**: coluna centralizada, fundo gradiente `linear-gradient(180deg,#0d1320,#0a1730)`.
- **Componentes**: ícone app 88×88, raio 24, fundo `--brand-deep`, ícone `sensors` 48px `#bcdcff`, sombra `0 16px 40px rgba(3,8,18,.5)`. Wordmark "vetor" 34px/700 Saira, letter-spacing 1px. Subtítulo "vistoria de frota" 13px `--text-2`. Barra de carregamento 140×5px (`--surf-2`, preenchida 45% em `--brand`) a ~64px do fundo. Rodapé mono "v2.4.1 · funciona sem internet" 10.5px `--text-mut` a 36px.
- **Comportamento**: exibir ~1–1.5s, depois rotear para login (ou home se sessão válida).

### 2. Login (`app-login`)
- **Propósito**: entrada do motorista. **Usuário + senha** (não crachá).
- **Layout**: coluna; topo com logo 56×56, título, subtítulo; campos; botão; link; banner offline colado ao rodapé.
- **Componentes**:
  - Logo 56×56 raio 16 `--brand-deep`, ícone `sensors` 30px.
  - Título "bem-vindo de volta" 26px/600. Subtítulo "entre com seu usuário e senha" 15px `--text-2`.
  - Campo **usuário**: label "usuário" 13px/600 `--text-2`; input 58px, raio 16, `--surf`, **borda 2px `--brand` (estado focado)**, ícone `person` 22px `--brand`, valor exemplo `marcos.oliveira` 18px Plex Sans, caret piscando.
  - Campo **senha**: label "senha"; input 58px raio 16 `--surf` borda 1px `--line`; ícone `lock` 22px `--text-mut`; valor mascarado `••••••` letter-spacing 4px; ícone `visibility` à direita (toggle mostrar/ocultar).
  - Botão "entrar" 62px, raio 18, `--brand`, texto `--brand-ink` 18px/600 + ícone `arrow_forward`, sombra de marca.
  - Link "esqueci minha senha" 15px `--brand`, centralizado.
  - **Banner offline** (rodapé): raio 14, warn-soft, ícone `wifi_off` 22px `--warn`, texto "sem internet — se você já entrou antes neste celular, dá para entrar e trabalhar normal. tudo é enviado depois." 13.5px `#f5d9a0`.
- **Estados**: erro de credencial (borda `--crit` + mensagem abaixo do campo), carregando (spinner no botão, desabilitado), offline (banner visível; permitir login se há sessão cacheada). *(Ver "Estados a implementar".)*

### 3. Home (`app-home`)
- **Propósito**: ponto de partida — veículo de hoje, status offline, botão iniciar, últimas vistorias.
- **Layout**: coluna, com **tab bar inferior** (início/histórico/perfil).
- **Componentes**:
  - Saudação "olá, marcos" 24px/600; linha "sua van de hoje é a **RQF-2318**" 15px (placa em Plex Mono `--text`).
  - **Banner offline**: warn-soft, raio 16, ícone `wifi_off` 24px, texto "sem internet agora — pode trabalhar normal. **3 vistorias** serão enviadas sozinhas quando a internet voltar." Contagem dinâmica.
  - **Botão hero** "começar vistoria": 84px, raio 22, `--brand`, coluna com ícone `assignment_turned_in` 28px + label 21px/600 e sub-label "leva uns 5 minutos" 12.5px opacity .75. Sombra `0 12px 28px rgba(92,179,255,.32)`.
  - **Últimas vistorias**: título "suas últimas vistorias" 14px/600 `--text-2`; itens 58px separados por borda-topo `--line-2`(#1c2638): ícone de estado (`schedule` warn = na fila; `check_circle` FILL ok = enviada) + data/hora 14px/600 + status 12.5px + chevron.
  - **Tab bar**: borda-topo #1c2638; 3 itens (home ativo `--brand` FILL, history, person `--text-mut`), ícone 24px + label 11px.
- **Estado vazio**: sem vistorias → texto convidando "faça sua primeira vistoria" no lugar da lista. Sem veículo vinculado → card do veículo vira CTA "vincular veículo".

### 4. Confirmar veículo (`app-confirm-vehicle`)
- **Propósito**: confirmar em qual veículo o motorista está antes de vistoriar.
- **Layout**: header com voltar; pergunta; card do veículo; 2 botões no rodapé.
- **Componentes**:
  - Título "você está com esta van?" 26px/600; subtítulo "confira a placa antes de começar" 15px `--text-2`.
  - Card veículo raio 20 `--surf`: topo com foto (placeholder listrado 150px → **foto real da van**); **placa** em selo claro: fundo `#e9eef7`, borda 2px `--line-2`, texto `#0d1320` 26px/700 Plex Mono letter-spacing 3px "RQF-2318"; modelo "mercedes sprinter 415 · branca" 14px `--text-2`; linha mono com `speed` "km atual: 84 312".
  - Botão primário "sim, é essa" 64px `--brand` + `check`. Botão secundário "não, escolher outra" 58px `--surf` borda `--line-2` + `swap_horiz`.

### 5. Permissão de câmera (`app-camera-permission`)
- **Propósito**: pedir acesso à câmera com clareza, antes da primeira foto.
- **Layout**: conteúdo centralizado; 2 botões no rodapé.
- **Componentes**: ícone 96×96 raio 26 brand-soft + `photo_camera` 50px `--brand`. Título "vamos usar a câmera" 25px/600. Texto "as fotos dos pneus e das avarias fazem parte da vistoria. as fotos ficam só no sistema da empresa." 15.5px `--text-2`. Botão "deixar usar a câmera" 64px `--brand`. Botão "agora não" 54px transparente `--text-2`.
- **Nota Capacitor**: o prompt nativo é disparado por `Camera.requestPermissions()` / na primeira `getPhoto()`. Esta tela é o **pré-prompt** (priming) — recomendado para dar contexto antes do diálogo do SO.

### 6. Checklist (`app-checklist`) — coração do app
- **Propósito**: mapa da vistoria; percorrer itens marcando estado, com progresso claro e possibilidade de voltar a corrigir.
- **Layout**: header (voltar + título + progresso textual); barra de progresso; lista de passos-card; botão "continuar" fixo no rodapé.
- **Componentes**:
  - Header: título "vistoria da van RQF-2318" 19px/600; sub "falta pouco: 2 de 5 passos feitos" 13px `--text-2`.
  - Barra de progresso 10px raio 5, trilha `--surf-2`, preenchida (40%) `--ok`.
  - **Card de passo** (min-height varia por estado, gap 10):
    - *feito ok*: bg `#12202f`, borda ok-soft; ícone `check_circle` FILL 28px `--ok`; título 16px/600; sub "feito — tudo bom" `--ok`; ação "rever" `--brand`.
    - *feito atenção*: borda warn-soft; ícone `warning` FILL `--warn`; sub "feito — óleo precisa de atenção".
    - *próximo* (destaque): min-height 76, bg `#152a45`, **borda 2px `--brand`**; tile de ícone 44×44 brand-soft; título 17px/600; sub "é o próximo passo" `--brand`; `arrow_forward` `--brand`.
    - *ainda não*: bg `--surf-3`, borda `--line-2`(#1c2638), opacity .75; `radio_button_unchecked` `--text-mut`; sub "ainda não".
  - Passos exemplo: pneus, óleo e água, luzes e setas, freios, avarias na lataria.
  - Botão rodapé "continuar: luzes e setas" 62px `--brand` + `arrow_forward`.
- **Comportamento**: tocar num passo abre o sub-fluxo dele; "rever" reabre um passo já feito. Progresso recalcula. Item com foto entra no fluxo câmera→avaliar.

### 7. Câmera do pneu (`app-tire-camera`)
- **Propósito**: fotografar o pneu (ou avaria).
- **Layout (protótipo)**: fundo de viewfinder (listras — no app é o preview real); header com fechar + rótulo do alvo + flash; quadro-guia central; barra inferior de captura.
- **Componentes**: botões translúcidos `rgba(5,7,12,.65)` 48×48 (`close`, `flash_on`); chip central "pneu traseiro esquerdo" 14px/600. **Quadro-guia** 250×250 raio 28, borda 3px tracejada `rgba(92,179,255,.85)`, com `box-shadow: 0 0 0 2000px rgba(5,7,12,.35)` (escurece o entorno); dica "encaixe o pneu inteiro no quadro". Barra: `photo_library` 52×52, **botão obturador** 82×82 (anel 5px `#e9eef7` + disco 62px), `help` 52×52.
- **Implementação Capacitor**: preferir `Camera.getPhoto({ source: CameraSource.Camera, quality, resultType: Uri })`, que abre a câmera nativa — **o viewfinder/obturador custom acima é opcional** (só se quiserem overlay de enquadramento; aí usar `@capacitor-community/camera-preview`). Para MVP de demonstração, `getPhoto()` nativo é suficiente e o rótulo do alvo aparece na tela anterior.
- **Estados de loading**: "abrindo câmera", "processando foto" (spinner sobre a área).

### 8. Avaliar o pneu (`app-tire-rate`)
- **Propósito**: após a foto, marcar estado; "trocar" gera flag/alerta para o gestor.
- **Layout**: header (voltar + "pneu 3 de 4"); pergunta; miniatura da foto com "refazer"; 3 botões de estado; banner de alerta condicional; botão confirmar.
- **Componentes**:
  - Pergunta "como está o pneu **traseiro esquerdo**?" 22px/600 (posição destacada em `--brand`).
  - Foto 150px raio 20 (placeholder → foto real); chip "refazer" canto inferior direito (fundo `rgba(5,7,12,.7)` borda `--line-2` + `refresh`).
  - **3 botões de estado** (min-height 58, raio 18, texto 18px/600, alinhado à esquerda, ícone 28px):
    - "está bom" — `check_circle` FILL `--ok`
    - "precisa de atenção" — `warning` FILL `--warn`
    - "precisa trocar" — `cancel` FILL `--crit`; selecionado ganha bg crit-soft + borda 2px `--crit`.
  - **Banner de alerta** (aparece só quando "trocar" selecionado): crit-soft, ícone `campaign` `--crit`, texto "o gestor da frota vai receber um **alerta deste pneu** junto com a foto."
  - Botão confirmar muda de cor conforme estado: em "trocar" fica `--crit` (texto `#1a0503`) "confirmar: precisa trocar".
- **Comportamento**: seleção dá haptic + realce imediato. Confirmar → volta ao checklist (ou próximo pneu). Marcar "trocar" persiste flag no registro para subir ao painel do gestor.

### 9. Revisão antes de enviar (`app-review`)
- **Propósito**: resumo de todos os itens, sinalizações e fotos, antes de finalizar.
- **Layout**: header (voltar + "confira antes de enviar" + "van RQF-2318 · hoje, 09:38"); lista de itens resumidos; banner offline; botão finalizar.
- **Componentes**: cards-resumo 11px pad, raio 14 `--surf`, borda por estado: miniatura 46×46 (foto) ou ícone; título 15px/600; linha de estado com ícone FILL + texto (`precisa trocar · vira alerta` `--crit`; `estão bons` `--ok`; `precisa de atenção` `--warn`; `tudo certo` `--ok`); ação "mudar" `--brand` (volta ao item). Banner offline warn-soft "sem internet — a vistoria fica **guardada no celular** e é enviada sozinha depois." Botão "finalizar vistoria" 62px `--brand` + `task_alt`.

### 10. Confirmação / sincronização (`app-confirmation`)
- **Propósito**: feedback de conclusão + estado de envio (enviado ou na fila offline).
- **Componentes**: círculo 104×104 borda 3px `--ok` + `check` 56px. Título "vistoria concluída!" 26px/600. Texto "ela está **guardada no celular**. quando a internet voltar, será enviada sozinha — você não precisa fazer nada." Chip "**4** vistorias na fila de envio" (`schedule` `--warn`). Chip crit-soft "1 alerta de pneu vai junto para o gestor" (`campaign`). Botões: "voltar para o início" `--brand`; "ver o resumo desta vistoria" texto `--brand`.
- **Variante online**: se houver rede, trocar copy para "enviada!" e mostrar progresso de upload em vez de fila.

### 11. Histórico (`app-history`) — via tab
- **Propósito**: lista das vistorias do motorista com estado (enviada / na fila); mostra o momento em que o sinal volta e a fila esvazia.
- **Componentes**: título "suas vistorias" 22px/600. **Banner "internet voltou"** ok-soft com `sync` pulsando + "internet voltou! enviando **2 de 4** vistorias…". Grupos por dia ("hoje"/"ontem" 12.5px/600 `--text-2`). Item 62px, borda-topo: ícone de estado (`sync` pulsando = enviando; `schedule` `--warn` = na fila; `check_circle` FILL `--ok` = enviada) + "hora · veículo" 14px/600 + status 12.5px + chevron. Tab bar com "histórico" ativo.

---

## Interações & comportamento
- **Navegação**: Angular Router. Guardas: `authGuard` (splash/login → home); dentro do fluxo de vistoria, impedir voltar sem confirmar descarte se houver dados não salvos.
- **Marcar estado (ok/atenção/trocar)**: `Haptics.impact(Medium)` + atualização visual síncrona (sem esperar rede). Persistir no registro local imediatamente.
- **Trocar = alerta**: ao confirmar "trocar", setar `flag: 'replace'` no item + `ion-toast` de confirmação ("alerta registrado para o gestor"). O alerta viaja junto no payload da vistoria.
- **Progresso**: derivar de `itensFeitos/itensTotais`; refletir na barra e no texto do checklist.
- **Câmera**: `Camera.getPhoto()`; loading enquanto abre/processa; opção refazer (chama de novo). Salvar URI/base64 no registro.
- **Offline/sync** (assinatura do app):
  - `Network.getStatus()` + listener `networkStatusChange`. Estado global `online$`.
  - Banner offline nas telas-chave quando `!online`.
  - Cada vistoria finalizada → **fila local** (`status: 'queued'`). Ao voltar rede, worker envia em ordem, atualizando `status: 'sending' → 'sent'` (ou `'error'`). Histórico e badges refletem em tempo real (RxJS).
  - Contadores ("3 vistorias na fila", "enviando 2 de 4") vêm da fila.
- **Transições**: respeitar `prefers-reduced-motion`; caso contrário usar transições padrão do Ionic + pulsos citados. Duração curta (150–250ms).

## Estados a implementar (não podem faltar)
- **Loading**: câmera abrindo, foto processando, sincronização em andamento (spinner + texto), login autenticando.
- **Vazios**: nenhuma vistoria ainda (home/histórico) — convite à ação na voz da interface; nenhum veículo vinculado — CTA para vincular.
- **Erro**: credencial inválida (login); foto falhou (repetir); **sync falhou** (item vira `error` no histórico com botão "tentar de novo"); sem veículo vinculado.
- **Alerta/confirmação**: toast ao marcar "trocar"; toast consistente ao concluir vistoria; alerta de descarte ao sair do fluxo.
- **Rede**: offline (banner âmbar), voltando (banner verde "enviando…"), online normal (sem banner).

## State management
```
SessionService     usuário logado, token, sessão cacheada p/ login offline
NetworkService     online$: BehaviorSubject<boolean> (via Capacitor Network)
VehicleService     veículo vinculado hoje, dados/placa/km
InspectionService  vistoria em andamento: itens[], estado por item, fotos, flags
QueueService       fila persistida de vistorias: {id, veiculo, itens, fotos, status, criadaEm}
                   status: 'draft'|'queued'|'sending'|'sent'|'error'
SyncService        observa online$; drena a fila; atualiza status; retry
```
Persistência: SQLite (`@capacitor-community/sqlite`) para registros+fotos, ou Preferences para MVP. Fotos: salvar arquivo via Filesystem e guardar caminho.

## Assets
- **Fontes**: Google Fonts — Saira, IBM Plex Sans, IBM Plex Mono. Material Symbols Outlined (ícones). Empacotar localmente para funcionar offline.
- **Imagens**: placeholders listrados no protótipo representam **foto real do veículo** (tela 4) e **fotos de pneu/avaria** (câmera). Logo/ícone do app é composto (quadrado + ícone `sensors`) — substituir por asset de marca final quando disponível.
- Nenhuma imagem proprietária incluída.

## Files
- `Vistoria-Assinatura.dc.html` — protótipo com todos os turnos. **O turno 3 (ids 3a–3k) é a referência canônica** do fluxo. Turnos 1 e 2 são explorações anteriores (turno 1 = variações de "instrumento", descartadas em favor do layout simples).
- Abrir em navegador para inspecionar medidas/cores diretamente.

## Notas
- Português do Brasil, **sentence case** em toda a UI. Copy concreta (sem placeholder genérico).
- Alto contraste para sol; alvos ≥48px; foco visível; `prefers-reduced-motion` respeitado — são piso de qualidade, não opcionais.
- Este README é autossuficiente: um dev que não participou da conversa consegue implementar só a partir daqui + o HTML de referência.
