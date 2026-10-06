# Endpoints — Vetor

Mapeamento de todos os pontos de comunicação com backend que os dois frontends (`vetor-app-web` e `vetor-app-mobile`) precisam. Hoje **não existe backend** — cada endpoint abaixo foi derivado do que o mock atual (`FleetStore` no web, serviços locais no mobile) já simula, para servir de contrato ao escrever a API NestJS (Prisma + JWT).

**Legenda:**
- ✅ implícito diretamente por um signal/método que já existe no mock — o endpoint só formaliza o que a tela já faz com dados falsos.
- 🆕 não existe no mock atual, mas é necessário para a funcionalidade funcionar de verdade (ex.: upload de foto, refresh token) — vale revisar antes de implementar.

Cada item referencia o arquivo/método de origem, pra rastreabilidade.

---

## Convenções gerais

- **Base URL sugerida:** `/api`.
- **Auth:** Bearer JWT no header `Authorization`. O token carrega `sub` (usuário), `papel` (`root` | `admin` | `motorista`) e `empresaId`.
- **Multi-tenancy:** `empresaId` nunca vai em path/query — vem do JWT e o backend escopa toda query por ele automaticamente (é a decisão de arquitetura central descrita no `README.md` da raiz). Usuários `root` são a exceção: não têm `empresaId` fixo, administram empresas.
- **Papéis por endpoint:** anotado como `[root]`, `[admin]` ou `[motorista]`. Sem anotação = qualquer usuário autenticado da empresa.
- **Erros:** formato sugerido `{ statusCode, message, error }` (padrão de exception filter do Nest).
- **Paginação:** nada no mock pagina hoje, mas `GET /abastecimentos`, `GET /vistorias` e `GET /manutencoes/historico` tendem a crescer — sugestão de `?page=&pageSize=` desde o início.

---

## 1. Autenticação

| Endpoint | Papel | Origem |
|---|---|---|
| `POST /auth/login` | público | ✅ `AuthService.login` (web, `core/auth.service.ts:18`) exige e-mail válido + senha `"demo"`; `SessionService.login` (mobile, `core/services/session.service.ts:24`) aceita usuário+senha não vazios. Um único endpoint cobre os três papéis — o corpo de resposta é que diferencia. |
| `POST /auth/refresh` | autenticado (refresh token) | 🆕 renovação de access token — hoje as duas apps só guardam a sessão localmente (Preferences no mobile, signal em memória no web) e nunca expiram. |
| `POST /auth/logout` | autenticado (refresh token) | 🆕 invalida o refresh token no servidor. `AuthService.logout` (web) e `SessionService.logout` (mobile) hoje só limpam estado local. |
| `GET /auth/me` | autenticado | 🆕 restaura a sessão a partir do token, em vez de confiar só no que foi salvo localmente. |

**`POST /auth/login`**
```
body:     { login: string, senha: string }   // login = e-mail (root/admin) ou usuário (motorista)
resposta: { accessToken, refreshToken, usuario: { id, nome, papel, empresaId | null } }
```

---

## 2. Empresa / Conta

Tela: `features/account` (web). Fonte: `FleetStore.account` / `updateAccount` (`core/fleet.store.ts:257`).

| Endpoint | Papel |
|---|---|
| `GET /empresa` ✅ | `[admin]` |
| `PATCH /empresa` ✅ — body: `Partial<{ nome, cnpj, contatoNome, contatoEmail, contatoFone }>` (nomes do schema; o web mapeia de/para `CompanyAccount` `{ empresa, cnpj, nome, email, fone }` em `fleet.store.ts`) | `[admin]` |

---

## 3. Integração de rastreamento (Hapolo)

Tela: `features/account` (web), seção de telemetria. Fonte: `hapoloConnect`/`hapoloTest`/`hapoloRemove` (`core/fleet.store.ts:262-282`). Esta é a camada que, no backend real, isola a API do rastreador externo — o resto do sistema nunca deve falar com ela diretamente (decisão de arquitetura do `README.md`).

| Endpoint | Papel |
|---|---|
| `GET /integracoes/rastreamento` ✅ — status (`conectado`\|`sem`) + cauda do token | `[admin]` |
| `POST /integracoes/rastreamento/conectar` ✅ — body: `{ token }` | `[admin]` |
| `POST /integracoes/rastreamento/testar` ✅ — dispara ping de teste | `[admin]` |
| `DELETE /integracoes/rastreamento` ✅ — remove o token | `[admin]` |

---

## 4. Veículos

Telas: `features/vehicles` (web), `pages/confirm-vehicle` (mobile). Fonte: `vehicles`/`addVehicle`/`deleteVehicle`/`findVehicleByPlaca` (`core/fleet.store.ts`).

| Endpoint | Papel |
|---|---|
| `GET /veiculos` ✅ — lista da frota (placa, modelo, tipo, motorista vinculado, hodômetro/combustível/km-L vindos da telemetria, status, pneus por posição, km rodados hoje) | `[admin]` |
| `POST /veiculos` ✅ — body: `{ placa, modelo, tipo }` | `[admin]` |
| `GET /veiculos/:id` ✅ — usado pela rota `/veiculos/:placa` | `[admin]` |
| `DELETE /veiculos/:id` ✅ — remove da frota; a cópia do modal (`delete-vehicle-modal.component.ts:12`) promete arquivamento de 90 dias antes de exclusão definitiva — se isso for levado a sério, é soft-delete, não `DELETE` físico | `[admin]` |
| `GET /veiculos/:id/vinculos` 🆕 — histórico motorista↔veículo; hoje é um array fixo simulado em `vehicle-detail.component.ts:28` (`dVinc`), não vem de mutação nenhuma | `[admin]` |
| `GET /motorista/veiculo-do-dia` ✅ — veículo vinculado ao motorista logado hoje. Fonte: `VehicleService.todaysVehicle` (mobile, `core/services/vehicle.service.ts:7`) | `[motorista]` |

---

## 5. Motoristas

Tela: `features/drivers` (web). Fonte: `drivers`/`addDriver` (`core/fleet.store.ts:228`).

| Endpoint | Papel |
|---|---|
| `GET /motoristas` ✅ — nome, categoria/validade da CNH, veículo vinculado (`veiculoAtual`, sem arquivados), vínculo desde (`vinculos` abertos), login do app (`usuario.usuario`, null = sem acesso — nunca a senha) | `[admin]` |
| `POST /motoristas` ✅ — body: `{ nome, categoriaCnh, validadeCnh?, usuario?, senha? }`. `usuario` + `senha` (juntos) criam o acesso ao app na mesma transação; usuário já usado -> 409 | `[admin]` |
| `PUT /motoristas/:id/acesso` ✅ — body: `{ usuario?, senha }`. Sem acesso ainda: cria (usuario obrigatório). Com acesso: redefine a senha (e o usuario, se vier) e revoga os refresh tokens dele — o celular pede login de novo | `[admin]` |

Sem exclusão/edição no mock — a UI atual (`drivers.component.html`) só cadastra e lista.

---

## 6. Combustível — abastecimentos e fornecedores

Tela: `features/fuel` (web). Fonte: `fuelEntries`/`addFuelEntry`/`fornecedores`/`addFornecedor`/`deleteFornecedor` (`core/fleet.store.ts`).

| Endpoint | Papel |
|---|---|
| `GET /abastecimentos` ✅ — histórico (data, veículo, fornecedor, litros, valor, hodômetro, km/L calculado, flag de consumo anômalo) | `[admin]` |
| `POST /abastecimentos` ✅ — body: `{ veiculoId, fornecedorId, litros, valor, hodometro, data }`. O km/L é calculado no backend contra o abastecimento anterior do mesmo veículo (hoje só um comentário decorativo no form, `fuel-form-modal.component.ts:41`) | `[admin]` |
| `GET /abastecimentos/km-l-semanal?semanas=8` ✅ — série pro gráfico do painel (`kmlWeekly`); sempre `semanas` pontos, a atual por último, `kmLMedio: null` em semana sem leitura | `[admin]` |
| `GET /fornecedores` ✅ — locais/postos cadastrados (nome, endereço, cidade, telefone, contagem de abastecimentos) | `[admin]` |
| `POST /fornecedores` ✅ — body: `{ nome, endereco, cidade, telefone }` | `[admin]` |
| `DELETE /fornecedores/:id` ✅ — 409 se o fornecedor tiver abastecimentos | `[admin]` |

---

## 7. Manutenção

Tela: `features/maintenance` (web). Fonte: `maintenanceItems`/`completeMaintenance`/`maintenanceHistory`/`plans` (`core/fleet.store.ts`).

| Endpoint | Papel |
|---|---|
| `GET /manutencoes/pendentes` ✅ — item, veículo, km/tempo restante, nível de urgência, prazo | `[admin]` |
| `POST /manutencoes/:id/concluir` ✅ — marca como feita (`completeMaintenance`); body opcional `{ custo, oficina }`; 409 se já concluída | `[admin]` |
| `GET /manutencoes/historico` ✅ — data, veículo, item, custo, oficina | `[admin]` |
| `GET /manutencoes/planos` ✅ — plano preventivo por tipo de veículo (item × km × tempo). Provavelmente configuração semi-estática por empresa, não por veículo individual | `[admin]` |

---

## 8. Pneus e vistorias

Telas: `features/tires` (web), fluxo `pages/checklist*` + `pages/review` (mobile). Fonte: `flaggedTires`/`inspections` (web); `QueueService`/`SyncService`/`InspectionService` (mobile).

| Endpoint | Papel |
|---|---|
| `GET /pneus/sinalizados` ✅ — pneus sinalizados pra troca/monitorar, originados de vistorias (`flaggedTires`). Resposta: `[{ veiculo: { id, placa }, posicao, severidade, observacao, vistoriaEm }]`, críticos primeiro; ignora veículos arquivados (módulo `pneus/`) | `[admin]` |
| `GET /vistorias` ✅ — vistorias recebidas do app, com itens do checklist e observações (`inspections`) | `[admin]` |
| `POST /vistorias` ✅ — chamado pelo `SyncService` por item da fila, depois de subir as fotos. Body: `{ clienteId?, veiculoId, iniciadoEm?, concluidoEm?, itens: [{ stepId, label, avaliacao: 'OK'\|'ATENCAO'\|'TROCAR', observacao?, midiaId? }] }`. `clienteId` = id do item da fila: reenviar o mesmo devolve a vistoria já criada (idempotente). `concluidoEm` = quando o motorista finalizou (futuro vira agora). `midiaId` de outra empresa/inexistente -> 400 | `[motorista]` |
| `POST /midia` 🆕 *(multipart/form-data)* — upload da foto tirada com `PhotoCaptureService` (`core/services/photo-capture.service.ts`), que hoje só produz um `dataUrl` base64 local; precisa subir antes de `POST /vistorias` referenciar o `midiaId`. Resposta: `{ id, url }` | `[motorista]` |
| `GET /vistorias/minhas` ✅ — histórico do próprio motorista; o app junta com a fila local (`HistoryService`) e guarda em cache, então sobrevive a reinstalação | `[motorista]` |

**Nota sobre a fila offline:** o fluxo local (`enqueue` → `queued` → `sending` → `sent`/`error`) descrito em `core/services/queue.service.ts` continua existindo com um backend real — ele só passa a persistir no device até `POST /vistorias` confirmar, em vez de simular o envio. `HistoryPage.retry()` (`pages/tabs/history/history.page.ts:63`) já assume que um item pode voltar a `queued` depois de um erro de rede, então uma resposta de erro do `POST /vistorias` deve mapear pra `status: 'error'` na fila.

---

## 9. Dashboard e relatórios

Telas: `features/dashboard`, `features/reports` (web). Fonte: `kpiTargets`/`dispCounts`/`alerts`/`custoWeekly`/`categoriesWithDelta`/`reportCosts`/`reportCategoriesEnriched` (`core/fleet.store.ts`).

| Endpoint | Papel |
|---|---|
| `GET /dashboard/resumo` ✅ — KPIs (custo do período, km/L médio, veículos disponíveis, total de alertas) + contagem por status (rodando/manutenção/parado) | `[admin]` |
| `GET /dashboard/alertas` ✅ — lista de alertas ativos com nível/ação sugerida; críticos primeiro, ignora veículos arquivados, consumo anômalo só dos últimos 30 dias | `[admin]` |
| `GET /dashboard/custo-semanal` ✅ — série de custo total por semana; sempre `semanas` pontos (default 8), as mesmas semanas de `km-l-semanal` | `[admin]` |
| `GET /relatorios/categorias-semana` ✅ — comparativo semana atual × anterior por categoria (combustível/manutenção/pneus), usado nos cards do painel | `[admin]` |
| `GET /relatorios/categorias-mensal?mesA=&mesB=` ✅ — comparativo mensal por categoria (hoje fixo em "jun"/"jul" no mock — os parâmetros formalizam isso) | `[admin]` |
| `GET /relatorios/custo-por-veiculo?de=&ate=&veiculoId=` ✅ — custo total, km rodado e R$/km por veículo, com filtro de escopo frota-inteira ou veículo único (`reports.component.ts` `escopoFiltro`) | `[admin]` |

---

## Entidades sugeridas (pra `schema.prisma`)

Nomes de campo no mock são abreviações em português (`hod`, `comb`, `kml`, `troca`, `mot`, `nv`...) — seguem os mesmos nomes por completo abaixo, já que é a convenção do projeto (ver `CLAUDE.md`), mas seria razoável usar nomes completos no schema real:

- **Empresa** — root gerencia várias; toda entidade abaixo carrega `empresaId`.
- **Usuario** — `papel: root | admin | motorista`, `empresaId` (null para root).
- **Veiculo** — `placa, modelo, tipo, motoristaId?, status, kmHoje`; hodômetro/combustível/km-L vêm da integração de rastreamento, não são digitados.
- **Motorista** — `nome, categoriaCnh, validadeCnh`, 1:N com `Veiculo` (vínculo atual) e histórico de vínculos.
- **Fornecedor** — `nome, endereco, cidade, telefone`.
- **Abastecimento** — `veiculoId, fornecedorId, litros, valor, hodometro, data`; km/L derivado, não armazenado (calculado contra o abastecimento anterior do mesmo veículo).
- **Manutencao** — item pendente (`veiculoId, item, kmRestante, nivel, prazo`) e `ManutencaoHistorico` (`veiculoId, item, custo, oficina, data`) provavelmente são a mesma tabela com um `status`.
- **Vistoria** — `veiculoId, motoristaId, iniciadoEm`, N `VistoriaItem` (`stepId, subItens: [{ label, avaliacao, midiaId?, observacao? }]`).
- **Midia** — arquivo de foto de vistoria, referenciado por `VistoriaItem`.
- **Alerta** — pode ser tabela própria ou view derivada (manutenção vencida, pneu sinalizado, CNH vencendo, consumo anômalo) — o mock trata como lista simples e não deixa claro se é persistido ou computado on-the-fly; computar em runtime evita duplicar estado.

---

## O que fica de fora deste mapeamento

- Endpoints puramente de UI local sem contraparte de servidor (ex.: `ModalService`, `ToastService`, tema claro/escuro) — não comunicam com backend.
- O rascunho de vistoria em andamento (`InspectionService`, `Preferences` key `vetor.inspection-draft`) é estado local do dispositivo enquanto o motorista preenche o checklist; só vira uma chamada de rede quando entra na fila (`QueueService.enqueue`) e sincroniza.
