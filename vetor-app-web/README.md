# Handoff: Vetor — Painel de Frotas (implementação Angular)

## Visão geral
Vetor é um **painel de gestão de frotas** para transportadoras. A tese de produto é **telemetria viva**: dados apresentados como instrumentos vivos (com contexto, faixa e tendência), não tabelas estáticas. O produto cobre monitoramento de veículos, combustível, manutenção, pneus/vistorias, motoristas e relatórios sob demanda.

Público: gestor de frota (admin) da transportadora. Idioma: **português (Brasil)**, sempre em **caixa baixa (sentence case)** nos rótulos de UI, com copy específica — nunca placeholder.

## Sobre os arquivos deste pacote
Os arquivos aqui são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não código de produção para copiar diretamente**. A tarefa é **recriar esses designs em Angular**, usando os padrões e bibliotecas estabelecidos do projeto Angular de destino (componentes standalone, signals ou RxJS, roteamento, etc.). Se ainda não houver base Angular, monte uma nova (Angular 17+ standalone recomendado) e implemente os designs nela.

Arquivos incluídos:
- `Vetor - Painel de Frotas.dc.html` — protótipo navegável completo (9 telas + modais + estados).
- `Vetor - Sistema de Design.md` — **fonte da verdade** dos tokens, tipografia, ícones e padrões. Leia primeiro.

> Nota técnica sobre o protótipo: ele foi escrito num formato de "Design Component" com `<x-dc>` e uma classe `Component` em `<script type="text/x-dc">`. É só o veículo do protótipo — **ignore o runtime**; use a marcação inline, os estilos e a lógica da classe como especificação. Toda a estilização está inline e mapeia 1:1 para o que você vai reconstruir.

## Fidelidade
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, ícones e interações são finais. Recrie a UI pixel-perfect com os componentes/estilos do codebase Angular. Todos os valores exatos estão no `Vetor - Sistema de Design.md` e resumidos abaixo.

---

## Arquitetura sugerida (Angular)
- **Angular standalone components**, um por tela, sob um `ShellComponent` com `<router-outlet>`.
- **Roteamento**: `/login`, `/`, `/veiculos`, `/veiculos/:placa`, `/combustivel`, `/manutencao`, `/pneus`, `/motoristas`, `/relatorios`.
- **Tema**: atributo `data-theme="dark|light"` no elemento raiz do shell; todos os tokens são CSS custom properties (ver abaixo). Um `ThemeService` (signal) alterna o atributo. Persistir em `localStorage`.
- **Estado**: um `FleetStore` (signals ou serviço com BehaviorSubject) com os dados de veículos, abastecimentos, manutenções, pneus, motoristas. Telas derivam listas via `computed`.
- **Gráficos**: `chart.js@4.4.1`. Encapsular num `ChartComponent` reutilizável que lê as cores do tema em runtime via `getComputedStyle` e **redesenha ao trocar tema** (ver seção Gráficos).
- **Ícones**: Google Material Symbols Outlined (web font). Criar um wrapper `<vetor-icon name="...">` ou usar `<span class="material-symbols-outlined">`.

---

## Design Tokens (CSS custom properties)
Definir em `:root` (tema escuro, padrão) e sobrescrever em `[data-theme="light"]`. **Nunca** hex solto em componentes — sempre `var(--token)`.

### Tema escuro (padrão)
```
--bg:#0d1320; --surf:#151d2c; --surf2:#1c2638;
--line:#26334a; --line2:#33425f;
--txt:#e9eef7; --mut:#a9b6c9; --dim:#6b7a92;
--tick:rgba(233,238,247,.14); --shadow:0 16px 40px rgba(3,8,18,.5);
--brand:#5cb3ff; --brand-bg:rgba(92,179,255,.12);
--ok:#3ecf8e-ish (verde-sinal); --ok-bg:rgba(...,.12);
--warn:âmbar; --warn-bg:rgba(...,.12);
--crit:rubi; --crit-bg:rgba(...,.1);
/* sidebar (fundo = cor principal) */
--side-bg:#0f3f7a; --side-fg:#eaf3ff; --side-dim:rgba(234,243,255,.62);
--side-active:rgba(255,255,255,.15); --side-line:rgba(255,255,255,.14); --side-accent:#bcdcff;
```

### Tema claro (`[data-theme="light"]`)
```
--bg:#eceff5; --surf:#ffffff; --surf2:#f3f6fb;
--line:#d9e0eb; --line2:#c4cfdf;
--txt:#17212f; --mut:#57687f; --dim:#8494aa;
--tick:rgba(23,33,47,.16); --shadow:0 16px 40px rgba(23,33,47,.12);
--brand:#1873c4; --brand-bg:rgba(24,115,196,.1);
--ok:#178a5d; --ok-bg:rgba(23,138,93,.1);
--warn:#a36e08; --warn-bg:rgba(163,110,8,.12);
--crit:#c2412f; --crit-bg:rgba(194,65,47,.1);
--side-bg:#1873c4; --side-fg:#f4f9ff; --side-dim:rgba(244,249,255,.72);
--side-active:rgba(255,255,255,.2); --side-line:rgba(255,255,255,.2); --side-accent:#ffffff;
```

> Valores exatos dos verdes/âmbar/rubi do tema escuro estão no `<style>` do protótipo (bloco `:root`). Copie-os de lá para garantir fidelidade.

**Regra semântica:** verde = saudável (rodando, na faixa); âmbar = atenção (manutenção próxima, alerta brando); rubi = crítico (parado, atrasado, falha). Máx. 1–2 cores de fundo por tela; a cor semântica é sempre pontual (dot, barra, ícone), nunca preenche o campo inteiro. Estado **nunca** só por cor — sempre cor + ícone/rótulo.

### Tipografia
| Família | Pesos | Papel |
|---|---|---|
| **Saira** | 500/600/700 | display: títulos de seção (~15px, 600), KPIs, wordmark |
| **IBM Plex Sans** | 400/500/600 | corpo e UI, base **14px** |
| **IBM Plex Mono** | 400/500 | números tabulares, placas, tokens, rótulos de escala/coluna (~10.5–11px, cor `--dim`), timestamps |

Números que se comparam (hodômetro, km/L, %, R$) sempre em Plex Mono com `font-variant-numeric: tabular-nums`. Corpo mínimo 12px.

### Ícones
Material Symbols Outlined, carregado com `display=block`. Tamanhos: 15–16px inline em listas, 18–23px em avatares/cabeçalhos. O ícone assume a cor semântica do dado que representa. Mapa por tipo de veículo: `airport_shuttle` (van de carga), `local_shipping` (caminhão leve), `directions_car` (carro). Navegação de item de lista: `chevron_right` em `--dim`.

### Raio, sombra, espaçamento
- Cards/painéis: `border-radius:14px`; `border:1px solid var(--line)`; `padding:20px 22px`; `background:var(--surf)`.
- Botões/chips: raio 8–10px. Avatares de ícone: 34–42px, raio 8–11px.
- Sombra de elevação (modais): `var(--shadow)`.
- Gap padrão entre blocos: 16px; dentro de cards: 10–14px.

---

## Padrão de instrumento (assinatura visual)
Barra de medição com escala de marcas (ticks) e preenchimento sobreposto, usado em nível de combustível, comparações e prazos de manutenção. A borda direita de 2px é a "agulha"; a cor do preenchimento é semântica.
```html
<div style="position:relative;height:8px;border-radius:2px;
     background:repeating-linear-gradient(90deg,var(--tick) 0 1px,transparent 1px 6px)">
  <div style="position:absolute;top:0;bottom:0;left:0;width:72%;
       background:linear-gradient(90deg,transparent 20%,var(--ok));
       border-right:2px solid var(--ok)"></div>
</div>
```

---

## Shell (layout base)
- Grid 2 colunas: `236px 1fr` (sidebar + conteúdo). Abaixo de 980px colapsa para `64px 1fr`, escondendo rótulos de nav e rodapé da sidebar; mostra só o monograma.
- **Sidebar** usa `--side-bg` (a cor principal) como fundo, com tokens `--side-*` de contraste. Item ativo: fundo `--side-active`, texto `--side-fg`, barra de acento `--side-accent`. Item inativo: fundo transparente, texto `--side-dim`, hover clareia o texto.
- Itens de nav: ícone (Material Symbols) + rótulo, `border-radius:9px`, `padding:10px 12px`, `font-size:13.5px`, peso 500.
- Rodapé da sidebar: nome da empresa (Transportes Almeida), "admin · Rui Almeida", link "acesso do provedor ↗".
- **Topbar** (no conteúdo): busca contextual + menu dropdown no canto superior direito com logout e configurações da conta.

---

## Telas / Views

### 1. Login
Entrada em tela cheia, branded (não card centralizado genérico). Campos: e-mail, senha. Copy pt-BR. Fundo com identidade Vetor. Botão primário `--brand`. Ação → navega para dashboard.

### 2. Visão geral (dashboard)
Hierarquia: título → linha de KPIs-instrumento → gráficos → listas de atenção → "frota agora".
- **KPIs como instrumento**: cada KPI traz leitura comparativa (vs. semana passada) com mini-escala de ticks, não número isolado.
- **Gráficos (Chart.js)**:
  - **Barra + linha combinada** "Custo e eficiência por semana": barras de custo (`--brand`, fill translúcido, `borderRadius:4`) no eixo Y esquerdo (formato `R$ {v/1000}k`); linha de km/L (`--ok`, `tension:.35`, pontos 3px) no eixo Y direito (min 6 / max 13). Interação `mode:'index'`. Altura do wrapper ~238px. Legenda custom fora do canvas (quadrado `--brand` = custo; traço `--ok` = km/L).
  - **Doughnut** "Disponibilidade da frota": rodando/manutenção/parado nas cores `--ok`/`--warn`/`--dim`, `cutout:'64%'`, `borderColor:var(--surf)` `borderWidth:3`, legenda embaixo com `pointStyle:'circle'`. Tooltip "N veículos".
- **Lista "O que fez gastar mais que a semana passada"**: linhas com categoria, barra de instrumento e valores.
- **Lista "Frota agora"** (era grid de cards → agora **lista**): cada linha é um `<button>` grid `34px minmax(120px,1.3fr) 1fr auto 22px`, gap 14px: avatar de ícone (cor de status) · placa (mono) + modelo (`--dim`, truncado) · ícone `person` + motorista · "N km hoje" (mono) + dot de status + rótulo · `chevron_right`. Hover `background:var(--surf2)`, `border-radius:8px`, `border-top:1px solid var(--line)`.

### 3. Veículos (lista)
Grid convertido em **lista rica** com cabeçalho de colunas (Plex Mono 11px `--dim`, `border-bottom:1px solid var(--line2)`). Colunas: `40px minmax(150px,1.3fr) 150px 160px 62px 150px 96px 22px`, gap 14px, `min-width:940px` com `overflow-x:auto`.
Cada linha (clicável → ficha): avatar de ícone por tipo · placa + status (dot+rótulo) / modelo · ícone `person`+motorista · **mini-instrumento de combustível** (nível % com agulha, cor semântica) · km/L (mono) · ícone `build`+"próxima troca" (cor por prazo) · **dots de pneus** (4 quadradinhos 10px coloridos por severidade, com `title`) · `chevron_right`.

### 4. Ficha do veículo (detalhe)
Cabeçalho com placa, modelo, status. Blocos: telemetria atual (instrumentos), histórico, próximas manutenções, pneus. Botão de abrir/editar. (Ver marcação no protótipo para composição exata.)

### 5. Combustível
Lista de abastecimentos + modal de novo abastecimento (form com validação, copy de erro específica). Instrumentos de nível/consumo.

### 6. Manutenção
Lista de manutenções previstas com barra de instrumento por prazo, prioridade por cor (`--ok/--warn/--crit`), ação "concluir". Ícone `build`.

### 7. Pneus / vistorias
Lista com severidade por cor + glifo. Dots/indicadores de posição de pneu.

### 8. Motoristas
Lista de motoristas com avatar de ícone `person`, vínculo com veículo. Modal de novo motorista.

### 9. Relatórios (geração sob demanda) — **foco recente, detalhar bem**
Para economizar recursos, relatórios só são processados quando o usuário pede. Fluxo em duas fases num mesmo componente, alternado por estado `relGerado` (null = picker; preenchido = resultado):

**Fase picker:**
- Banner informativo (ícone `bolt`, `--brand`): "Geração sob demanda… escolha um tipo abaixo para economizar recursos da frota."
- **Seletor de abrangência** (2 opções, chips grandes com ícone): **"Frota inteira"** (`grid_view`) ou **"Veículo específico"** (`local_shipping`). Selecionado ganha `--brand-bg`/borda `--brand`/texto `--brand`.
  - Ao escolher "Veículo específico" → abre **modal de busca de veículo** (ver Modais). Depois de escolher, um botão-gatilho mostra a placa selecionada (ícone `search` + placa mono + `expand_more`); clicar reabre o modal.
- **Grade de tipos de relatório** (cards `minmax(268px,1fr)`, gap 14px): cada card tem avatar de ícone, título (Saira 600 15px), descrição, e rodapé mono com período (`calendar_month`) e volume de linhas (`table_rows`). Card selecionado: `--brand-bg`, borda `--brand`, badge de check `--brand` no canto. Tipos:
  1. **Comparativo de custos** (`compare_arrows`) — custo por categoria jun×jul + projeção.
  2. **Custo por veículo** (`local_shipping`) — km, custo total, R$/km.
  3. **Consumo e eficiência** (`speed`) — km/L por veículo, ordenado do mais eficiente ao pior.
  4. **Disponibilidade da frota** (`donut_large`) — distribuição rodando/manutenção/parado (doughnut).
  5. **Manutenções previstas** (`build`) — trocas/revisões por prazo e prioridade.
- Botão primário **"Gerar relatório"** (`play_arrow`; durante processamento vira spinner `progress_activity` girando). Simula ~650ms de processamento e então mostra o resultado.

**Fase resultado:**
- Cabeçalho: botão voltar (`arrow_back`, volta ao picker), avatar de ícone do tipo, título, e subtítulo mono `"{período} · {abrangência} · gerado {data}"` — abrangência = "frota inteira" ou "veículo AAA-0000". Ações: **Exportar CSV** (`download`, secundário) e **Exportar PDF** (`picture_as_pdf`, primário `--brand`).
- Corpo muda por tipo (todos respeitam o filtro de abrangência):
  - **Comparativo**: card de custo por categoria (barras jul sobre jun, mono à direita) + nota de projeção; card de custo por veículo (tabela mono: veículo, km, custo, R$/km).
  - **Custo por veículo**: lista mono com ícone `local_shipping`.
  - **Consumo**: lista ordenada por km/L desc, com **instrumento de eficiência** (cor por faixa: ≥9 verde "eficiente", ≥7 âmbar "na média", senão rubi "abaixo").
  - **Disponibilidade**: doughnut (`--ok/--warn/--dim`) + lista com avatar de ícone (`check_circle`/`build`/`pause_circle`), contagem e % da frota. Contagens derivadas do escopo selecionado.
  - **Manutenções**: lista com ícone `build` (cor por prazo), referência com barra de instrumento e prazo mono colorido.

---

## Modais
Padrão: backdrop `rgba(5,9,17,.62)` + `backdrop-filter:blur(3px)`, z-index 80. Diálogo `background:var(--surf)`, `border:1px solid var(--line2)`, `border-radius:16px`, `box-shadow:var(--shadow)`. **stopPropagation** no diálogo para clique interno não fechar; clique no backdrop fecha (nos modais de busca) — modais destrutivos fecham só por botão.

- **Excluir veículo** — confirmação destrutiva com aviso de arquivamento (90 dias).
- **Novo abastecimento / novo motorista / novo veículo** — forms com validação e copy de erro específica.
- **Busca de veículo (relatórios)** — alinhado ao topo (`padding-top:64px`), `max-width:480px`, `max-height:70vh`. Cabeçalho com título "Procurar veículo" + botão fechar (`close`) + campo de busca (ícone `search`, filtra por **placa, modelo ou motorista**, case-insensitive). Lista de resultados: cada item é `<button>` grid `38px 1fr auto` — avatar de ícone por tipo (cor de status), placa mono + "modelo · motorista" (`--dim`, truncado), e `check_circle` `--brand` no selecionado. Clicar seleciona e fecha o modal.

---

## Interações & comportamento
- **Navegação** entre telas via sidebar; ficha do veículo aberta ao clicar linha da lista.
- **Dropdown** superior direito: logout + configurações da conta (tela dedicada com dados da empresa editáveis + aba Integrações para token do rastreamento Hapolo).
- **Toasts**: informativos (`info`, `--brand`) e sucesso (`check_circle`, `--ok`).
- **Geração de relatório**: estado `relGerando` por ~650ms com spinner, depois resultado.
- **Troca de tema**: atualiza `data-theme` e **redesenha os gráficos** relendo cores do tema.

## Motion
Mínima e proposital. Keyframes: `pulse` (alerta crítico), `shimmer` (skeleton), `fadeup` (entrada de conteúdo, .3s ease), `slidein` (painel lateral), `spin` (loader). Count-up em métricas ao carregar; pulso discreto só em alerta crítico. **Respeitar `prefers-reduced-motion`** — reduzir animações/transições a ~0s.

## Estados de dados
Todo dado prevê: **carregando** (skeleton com shimmer), **vazio** (mensagem específica + ação), **erro** (mensagem + retry), **integração offline** (rastreamento Hapolo indisponível → aviso âmbar, dados marcados como defasados). Nunca tela em branco. No protótipo há controles para simular esses estados.

## Gráficos — detalhes de implementação (Chart.js)
- Ler cores do tema em runtime: `getComputedStyle(canvasEl)` → `--txt/--mut/--dim/--line/--brand/--ok/--warn/--crit/--surf`.
- Recriar/atualizar o gráfico quando o tema muda ou quando o escopo/tipo do relatório muda.
- `responsive:true, maintainAspectRatio:false` dentro de wrapper com altura fixa.
- Grid nas cores `--line`; ticks em `--dim`; sem bordas duras.
- Formatação pt-BR: `toLocaleString('pt-BR')`, decimais com vírgula, `R$`, `km/L`.
- No Angular, destruir a instância do Chart no `ngOnDestroy` e ao recriar (evitar vazamento de canvas).

## Acessibilidade
- Foco visível: `:focus-visible{outline:2px solid var(--brand);outline-offset:2px}`.
- Contraste adequado nos dois temas (a sidebar tem tokens próprios exatamente por isso).
- Estado sempre por cor + ícone/rótulo. Alvos de toque ≥ 44px em contexto mobile. `role="dialog"` + `aria-modal` nos modais.
- Links: `a{color:var(--brand)}`, `a:hover{color:var(--txt)}`.

## Assets
- **Fontes** (Google Fonts): `Saira:wght@500;600;700`, `IBM+Plex+Sans:wght@400;500;600`, `IBM+Plex+Mono:wght@400;500`.
- **Ícones**: Material Symbols Outlined — `...Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=block`.
- **Chart.js**: `chart.js@4.4.1` (via npm no projeto Angular).
- Sem imagens raster; identidade é puramente tipográfica/cor. Não há assets de marca de terceiros a licenciar.

## Arquivos neste pacote
- `Vetor - Painel de Frotas.dc.html` — protótipo completo (referência de marcação, estilos inline e lógica).
- `Vetor - Sistema de Design.md` — tokens, tipografia, ícones e padrões (fonte da verdade).

## Como usar o protótipo como especificação
1. Abra `Vetor - Painel de Frotas.dc.html` no navegador para navegar as telas e ver comportamento.
2. Para valores exatos, leia o `<style>` (bloco `:root` / `[data-theme="light"]`) no topo do arquivo.
3. Para lógica/derivações (filtros de relatório, escopo, contagens, geração), leia a classe `Component` no `<script type="text/x-dc">` ao final do arquivo — as chaves em `renderVals()` mapeiam para os `{{ }}` da marcação.
4. Reconstrua cada tela como componente Angular standalone, mantendo tokens como CSS custom properties e a estilização fiel ao inline do protótipo.
