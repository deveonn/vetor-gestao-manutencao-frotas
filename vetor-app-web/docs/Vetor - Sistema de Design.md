# Vetor — Sistema de Design

Documento base para construir apps complementares consistentes com o **Painel de Frotas Vetor**.
Tese central: **telemetria viva** — dados como instrumentos vivos, não tabelas estáticas. Cada número carrega contexto (comparação, faixa, tendência), motion é mínimo e proposital, e a leitura de estado é sempre por cor + ícone + rótulo (nunca só cor).

Idioma: **português (Brasil)**, sempre em **caixa baixa (sentence case)** em rótulos de UI, com copy específica — nunca placeholder.

---

## 1. Cores (design tokens)

Sistema **dark-first** com tema claro paralelo. Toda cor é uma CSS custom property em `:root` (dark) e `[data-theme="light"]`. Nunca use hex solto em componentes — sempre `var(--token)`.

### Tema escuro (padrão)
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0d1320` | fundo da aplicação (grafite-noite) |
| `--surf` | `#151d2c` | superfície de card / painel |
| `--surf2` | `#1c2638` | superfície elevada / hover / linha zebrada |
| `--line` | `#26334a` | borda / divisória padrão |
| `--line2` | `#33425f` | borda de destaque / hover |
| `--txt` | `#e9eef7` | texto primário |
| `--mut` | `#a9b6c9` (aprox.) | texto secundário |
| `--dim` | `#6b7a92` (aprox.) | texto terciário / rótulos mono |
| `--tick` | `rgba(233,238,247,.14)` | marcas de escala de instrumento |
| `--shadow` | `0 16px 40px rgba(3,8,18,.5)` | elevação |

### Tema claro (`[data-theme="light"]`)
| Token | Valor |
|---|---|
| `--bg` | `#eceff5` |
| `--surf` | `#ffffff` |
| `--surf2` | `#f3f6fb` |
| `--line` | `#d9e0eb` |
| `--line2` | `#c4cfdf` |
| `--txt` | `#17212f` |
| `--mut` | `#57687f` |
| `--dim` | `#8494aa` |
| `--tick` | `rgba(23,33,47,.16)` |
| `--shadow` | `0 16px 40px rgba(23,33,47,.12)` |

### Cores de marca e semânticas (ambos os temas)
Cada cor semântica vem em par: cor sólida + fundo translúcido (`-bg`) para chips/badges.

| Papel | Token | Dark | Light | Significado |
|---|---|---|---|---|
| Marca | `--brand` / `--brand-bg` | `#5cb3ff` / `rgba(92,179,255,.12)` | `#1873c4` / `rgba(24,115,196,.1)` | ação, seleção, links |
| Saudável | `--ok` / `--ok-bg` | verde-sinal | `#178a5d` / `rgba(23,138,93,.1)` | rodando, dentro da faixa |
| Atenção | `--warn` / `--warn-bg` | âmbar | `#a36e08` / `rgba(163,110,8,.12)` | manutenção próxima, alerta brando |
| Crítico | `--crit` / `--crit-bg` | rubi | `#c2412f` / `rgba(194,65,47,.1)` | parado, atrasado, falha |

**Regra:** verde = saudável, âmbar = atenção, rubi = crítico. Use no máximo 1–2 cores de fundo por tela; a cor semântica é sempre pontual (dot, barra, ícone), nunca campo inteiro.

### Menu lateral (sidebar)
Sidebar usa a **cor principal como fundo**, com tokens próprios de contraste:

| Token | Dark | Light |
|---|---|---|
| `--side-bg` | `#0f3f7a` | `#1873c4` |
| `--side-fg` | `#eaf3ff` | `#f4f9ff` |
| `--side-dim` | `rgba(234,243,255,.62)` | `rgba(244,249,255,.72)` |
| `--side-active` | `rgba(255,255,255,.15)` | `rgba(255,255,255,.2)` |
| `--side-line` | `rgba(255,255,255,.14)` | `rgba(255,255,255,.2)` |
| `--side-accent` | `#bcdcff` | `#ffffff` |

Item ativo: fundo `--side-active`, texto `--side-fg`, barra de acento `--side-accent`. Item inativo: fundo transparente, texto `--side-dim`.

---

## 2. Tipografia

Três famílias, cada uma com papel fixo:

| Família | Pesos | Papel |
|---|---|---|
| **Saira** | 500 / 600 / 700 | display: títulos de seção, KPIs grandes, wordmark |
| **IBM Plex Sans** | 400 / 500 / 600 | corpo, rótulos, texto de interface (base 14px) |
| **IBM Plex Mono** | 400 / 500 | números tabulares, placas, tokens, rótulos de escala, timestamps |

Import:
```
Saira:wght@500;600;700
IBM+Plex+Sans:wght@400;500;600
IBM+Plex+Mono:wght@400;500
```

**Regras:**
- Números que se comparam (hodômetro, km/L, %, R$) → sempre Plex Mono + `font-variant-numeric:tabular-nums`.
- Rótulos de eixo/escala/coluna → Plex Mono, ~10.5–11px, cor `--dim`, caixa baixa.
- Títulos de painel → Saira 600, ~15px.
- Corpo mínimo 12px; nunca abaixo disso.

---

## 3. Ícones

**Google Material Symbols Outlined**, carregados com `display=block` (evita flash de texto).
```
Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0
```
- Tamanhos típicos: 15–16px inline em listas, 18–21px em avatares/cabeçalhos.
- Ícone acompanha cor semântica do dado que representa (ex.: `build` na cor `--warn` para troca próxima).
- Ícones por tipo de veículo: `airport_shuttle` (van de carga), `local_shipping` (caminhão leve), `directions_car` (carro).
- Ícone de navegação de item de lista: `chevron_right` em `--dim`.

---

## 4. Padrão de instrumento (assinatura visual)

Elemento-assinatura do Vetor. Uma **escala de marcas (ticks)** com preenchimento sobreposto — usado em nível de combustível, comparação de KPI, timers de manutenção.

```html
<div style="position:relative;height:8px;border-radius:2px;
     background:repeating-linear-gradient(90deg,var(--tick) 0 1px,transparent 1px 6px)">
  <div style="position:absolute;top:0;bottom:0;left:0;width:72%;
       background:linear-gradient(90deg,transparent 20%,var(--ok));
       border-right:2px solid var(--ok)"></div>
</div>
```
A borda direita de 2px é a "agulha". A cor do preenchimento é semântica (nível baixo → `--warn`/`--crit`).

---

## 5. Layout e componentes

### Shell
Grid de 2 colunas: `236px 1fr` (sidebar + conteúdo). Colapsa para `64px 1fr` abaixo de 980px, escondendo rótulos de nav e rodapé da sidebar; mostra monograma.

### Cards / painéis
`background:var(--surf); border:1px solid var(--line); border-radius:14px; padding:20px 22px`.
Cabeçalho de painel: título Saira 600 15px + ícone 18px em `--brand` à esquerda; legenda/controles à direita.

### Listas (preferir a grids de cards)
Dados repetidos vão em **listas**, não grids de cards. Padrão de linha:
- Grid de colunas explícito (`grid-template-columns` com larguras fixas + `minmax`), `gap:14px`, `align-items:center`.
- Cabeçalho de colunas em Plex Mono 11px `--dim`, caixa baixa, com `border-bottom:1px solid var(--line2)`.
- Cada linha: `border-top:1px solid var(--line)`, `padding:11–13px 8px`, `border-radius:8px`, hover `background:var(--surf2)`, cursor pointer.
- **Avatar de ícone** à esquerda: 34–40px, `border-radius:8–9px`, `background:var(--surf2)`, borda `--line`, ícone na cor de status.
- Célula de identidade: placa (Plex Mono) + status (dot colorido + rótulo) na linha 1; modelo em `--dim` truncado na linha 2.
- Enriquecer com: mini-instrumento de combustível, km/L tabular, ícone `person` + motorista, `chevron_right` final.
- Overflow horizontal com `min-width` na linha quando houver muitas colunas.

### Gráficos (Chart.js 4.4.1)
Na **visão geral**, usar Chart.js (UMD via CDN). Padrões:
- Cores sempre lidas dos tokens de tema em runtime (`getComputedStyle`), redesenhando ao trocar tema.
- **Barra + linha combinada** (custo × km/L) com dois eixos Y; barra `--brand` com fill translúcido, linha `--ok`.
- **Doughnut** de disponibilidade (rodando/manutenção/parado) com `cutout:'64%'`, cores `--ok`/`--warn`/`--dim`, legenda embaixo com `pointStyle:'circle'`.
- Grid nas cores `--line`; ticks em `--dim`; sem bordas duras.
- Tooltips e eixos formatados em pt-BR (`toLocaleString('pt-BR')`, decimais com vírgula, `R$`, `km/L`).
- `responsive:true, maintainAspectRatio:false` dentro de wrapper com altura fixa (~238px).

### Chips de status
`background:var(--*-bg); color:var(--*); border-radius`, com dot 6–7px ou ícone. Sempre cor + rótulo textual.

---

## 6. Motion

Mínimo e proposital. Keyframes disponíveis: `pulse` (alerta crítico), `shimmer` (skeleton loading), `fadeup` (entrada de conteúdo), `slidein` (painel lateral), `spin` (loader).
- Count-up em métricas ao carregar.
- Pulso discreto só em alerta crítico.
- **Respeitar `prefers-reduced-motion`**: todas as animações/transições reduzidas a ~0s.

---

## 7. Acessibilidade

- Foco visível: `:focus-visible{outline:2px solid var(--brand);outline-offset:2px}`.
- Contraste adequado em ambos os temas (sidebar tem tokens próprios exatamente por isso).
- Estado nunca comunicado só por cor — sempre cor + ícone/rótulo.
- Alvos de toque ≥ 44px em contexto mobile.
- Links: `a{color:var(--brand)}`, `a:hover{color:var(--txt)}`.

---

## 8. Estados de dados

Todo dado deve prever: **carregando** (skeleton com shimmer), **vazio** (mensagem específica + ação), **erro** (mensagem + retry), e **integração offline** (rastreamento Hapolo indisponível → aviso âmbar, dados marcados como defasados). Nunca tela em branco.

---

## 9. Checklist para o app complemento

- [ ] Copiar `:root` e `[data-theme="light"]` com todos os tokens acima (incl. `--side-*`).
- [ ] Mesmas 3 famílias de fonte + Material Symbols com `display=block`.
- [ ] Sidebar com `--side-bg` (cor principal) e tokens de contraste.
- [ ] Dados repetidos como listas iconografadas, não grids de cards.
- [ ] Gráficos via Chart.js lendo cores do tema em runtime.
- [ ] Padrão de instrumento (ticks) para qualquer medição em faixa.
- [ ] Copy pt-BR, caixa baixa, específica; números em Plex Mono tabular.
- [ ] Estados loading/vazio/erro/offline + `prefers-reduced-motion`.
