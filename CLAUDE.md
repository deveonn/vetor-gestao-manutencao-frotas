# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Vetor** is a portfolio prototype of a fleet management system. It's a monorepo of three independent projects, none of which share a build system or package manager workspace — each has its own `package.json` and is developed/run separately:

- `vetor-app-web/` — Angular 21 manager dashboard ("painel do gestor"). **Fully wired to the real API (no mock data left).**
- `vetor-app-mobile/` — Ionic 8 + Angular 21 + Capacitor Android app for drivers ("motorista") to run vehicle inspections offline. **Fully implemented, uses local device storage (Capacitor Preferences) instead of a real backend.**
- `vetor-backend/` — NestJS 11 + Prisma 6 + JWT API, implemented against the contract in `/endpoints.md`. **Real code; the web app is fully wired to it, the mobile app is not yet** — see below.

The API is the sole client of an external vehicle-tracking platform (internally called **Hapolo** in the web app's code — the README genericizes this as "plataforma de rastreamento"; the backend calls it "integração de rastreamento" and only has the token-connect plumbing so far, not an actual call to the external service). It owns multi-tenant isolation (every domain row scoped by `empresaId`, read from the JWT), auth (root / admin / motorista roles), and business rules (km/L calculation, consumption-anomaly flagging, tire-status rollup from inspections). See the root `README.md` for the architecture diagram and `vetor-backend/README-backend.md` for setup/run instructions, and `/endpoints.md` for the endpoint-by-endpoint contract (each one tagged ✅/🆕 against what the frontend mocks implied).

**Frontend wiring is tracked item by item in `/PENDENCIAS_DEPLOY.txt`.** `vetor-app-web` is done: auth (login/refresh/logout/me) and every screen load from and write to the API — `mock-data.ts` no longer exists. `vetor-app-mobile` still uses mock/no-op auth (`SessionService.login` accepts any non-empty username+password) plus a local Capacitor-persisted queue that simulates sync with fake network delays. Wiring a frontend to the real backend (replacing a `FleetStore` mutation or a mobile service call with an HTTP call) is done one checklist item at a time — check `/endpoints.md` for the target route/payload shape before doing it.

## Commands

Each app is developed independently; `cd` into it first.

### vetor-app-web
```bash
cd vetor-app-web
npm install
npm start          # ng serve
npm run build       # ng build
npm run watch        # ng build --watch --configuration development
npm test            # ng test
```

### vetor-app-mobile
```bash
cd vetor-app-mobile
npm install
npm start           # ng serve (browser preview, no native shell)
npm run build
npm test            # ng test (uses @angular/build:unit-test + vitest/jsdom)
npx cap sync         # sync web build into the native Android project
ionic serve          # alt dev server
npx cap run android   # build & run on Android device/emulator
```
There is exactly one spec file (`src/app/app.spec.ts`) — the mobile test suite is minimal.

### vetor-backend
```bash
cd vetor-backend
docker compose up -d               # local Postgres+PostGIS (see docker-compose.yml)
npm install
cp .env.example .env
npx prisma migrate dev --name init # create tables
npm run prisma:seed                # seed data (plates/drivers/suppliers from the web app's original mock)
npm run start:dev                  # dev with watch, http://localhost:3000/api (Swagger at /api/docs)
npm run build                      # nest build
npm run prisma:generate            # regenerate Prisma Client after editing schema.prisma
npm run prisma:studio              # DB GUI
```
No test suite or linter configured yet (matches the frontends — neither has one either).

Neither web nor mobile `package.json` defines a `lint` script — there's no configured linter in either frontend currently.

## Architecture notes

### Web app (`vetor-app-web`)
- Standalone Angular components, no NgModules. Routes lazy-load via `loadComponent` (`src/app/app.routes.ts`).
- `core/fleet.store.ts` (`FleetStore`) is the single source of app state — Angular signals holding API data (vehicles, alerts, fuel entries, maintenance, tires, inspections, drivers, reports, account), plus `computed()` signals that derive display-ready/formatted versions (`vehiclesEnriched`, `alertsEnriched`, etc.) and async mutation methods (`addVehicle`, `addFuelEntry`, `completeMaintenance`, ...) that call the API, update the signal from the response and show a toast via `ToastService`. When adding a feature, follow this pattern: `*Api` interface + `para*` mapper (Prisma field names → abbreviated web model) → raw signal filled by a `load*()` method → `computed` "enriched" signal for the view → async mutation that returns an error message (or `null`) for the component to show inline. The shell (`layout/shell.component.ts`) calls every `load*()` once on mount; the dashboard and reports screens reload their own data on each visit, and mutations that affect cost/alerts call `refreshDashboard()`.
- Domain field names in `core/models.ts` are abbreviated Portuguese (`hod` = hodômetro, `comb` = combustível, `troca` = km until oil change, `mot` = motorista, `nv` = nível/severity, `resta` = remaining km, etc.) — keep this convention when extending existing interfaces rather than introducing English or expanded names.
- `ModalService` and `ToastService` are simple global signal-backed services (active modal id + context, toast queue) driving `shared/modal-host` and `shared/toast-host`, rendered once at the shell level.
- Real auth against the API: `AuthService.login()` calls `POST /auth/login` (only `ADMIN` may enter the panel; seed user `rui@transportesalmeida.com.br` / `demo123`), `TokenService` persists the access/refresh pair in `localStorage` (`vetor.tokens`), and `core/auth.interceptor.ts` adds the Bearer token and does a single shared refresh on 401 (ending the session if that fails). API base URL lives in `src/environments/`. `auth.guard.ts` has `authGuard`/`loginGuard` pair gating the shell routes vs. the login route.
- `hapolo*` methods/signals on `FleetStore` connect/test/remove the tracking integration token through the API (`/integracoes/rastreamento`). The backend only stores the token; its "testar" doesn't call the real external platform yet (out of scope, see `PENDENCIAS_DEPLOY.txt` backend #4). `offline` (the shell's banner) means "no token connected".
- Pattern for API-backed state so far: `FleetStore` injects `HttpClient`, maps API field names (Prisma schema) to the abbreviated web models in small `para*` helpers, and exposes `load*()` methods the shell calls on mount (`loadAccount`, `loadHapolo`). Mutations become `async` and return an error message (or `null`) for the component to show inline.
- Charts use `chart.js` via `shared/chart/` (`chart-builders.ts` + `chart.component.ts`).

### Mobile app (`vetor-app-mobile`)
- Ionic pages under `src/app/pages/`, standalone components, lazy-loaded routes (`app.routes.ts`). Non-tab flow (splash → login → confirm-vehicle → checklist → checklist-rate → review → confirmation) sits outside `ion-tabs`; home/history/profile are tabbed children.
- **Offline-first is the core design constraint**, not an edge case — inspections are always written locally first:
  - `SessionService` persists login session to `Preferences` (`vetor.session`) for offline re-entry; `SessionService.login` is mock auth (any non-empty username/password succeeds).
  - `QueueService` persists inspections to `Preferences` (`vetor.queue`) as `QueuedInspection` records with status `queued → sending → sent`.
  - `SyncService` is an Angular `effect()` that watches `NetworkService.online()` + the queue; when back online and items are queued, it drains the queue one item at a time with a simulated 1200ms send delay per item (`SEND_DELAY_MS`) — there is no real network call yet, this is a stand-in for the future backend sync endpoint.
  - `NetworkService` wraps `@capacitor/network`.
- `unsaved-inspection.guard.ts` (`canDeactivate`) prevents navigating away mid-inspection without confirmation.
- `docs/HANDOFF.md` is the authoritative design spec for this app: full design-token list (colors, typography — Saira/IBM Plex Sans/IBM Plex Mono, spacing, touch-target minimums ≥48px), per-screen layout/behavior spec, and the Capacitor plugin mapping (`Camera`, `Network`, `Preferences`, `Haptics`, `StatusBar`). Read it before making UI changes to this app — it documents *why* (glove-friendly targets, sunlight-readable contrast, offline-first) as well as *what*.
- Design tokens/colors are shared conceptually with the web app's dark theme (same hex palette), reimplemented independently per app — there's no shared styling package.

### Backend (`vetor-backend`)
- Standard Nest module-per-domain layout under `src/`: `auth`, `empresas`, `integracao-rastreamento`, `veiculos`, `motoristas`, `fornecedores`, `abastecimentos`, `manutencoes`, `vistorias`, `pneus`, `midia`, `dashboard`, `relatorios` — each with its own `*.controller.ts`/`*.service.ts`/`dto/` (`pneus` only has `GET /pneus/sinalizados`, derived from `PneuPosicao` + the latest inspection of that position). `PrismaModule` is `@Global()`; every service injects `PrismaService` directly rather than going through a repository layer.
- `JwtAuthGuard` and `RolesGuard` are registered globally (`APP_GUARD` in `app.module.ts`). Routes are protected by default — use `@Public()` to exempt a route (only `/auth/login`, `/auth/refresh`, `/health` use it) and `@Roles(Papel.ADMIN | Papel.MOTORISTA | Papel.ROOT)` to restrict by role. `@CurrentUser()` pulls the decoded `JwtPayload` (`sub`, `papel`, `empresaId`, `motoristaId`) off the request.
- **Every service method takes `empresaId` from the JWT and includes it in the Prisma `where` clause** — this is the multi-tenant boundary described in the root README, enforced at the query level in every module, not just at the route level. When adding a new query/mutation, follow this pattern rather than trusting an `:id` param alone.
- Refresh tokens are opaque random strings (not JWTs), stored hashed (SHA-256) in the `RefreshToken` table and rotated on every `POST /auth/refresh` (old one revoked, new one issued) — see `auth.service.ts`.
- `prisma/schema.prisma` is heavily commented with which frontend mock each model/field traces back to, plus a few explicit reconciliations where the two frontends' mocks disagreed (e.g. `TipoVeiculo` unifies web's Utilitário/Van de carga/Caminhão leve with mobile's carro/van/caminhao tire-diagram categories). Read those comments before changing the schema.
- `prisma/seed.ts` populates a fresh database with data taken from the web app's original mock (same plates, drivers, suppliers, fuel entries) — it's the fixture the web app runs against locally. Some seeded values are copied, not computed, and don't match the backend's own formulas (e.g. seeded km/L), see `PENDENCIAS_DEPLOY.txt`.
- Business logic that lives in the backend now instead of the frontend mock: km/L and consumption-anomaly calculation (`abastecimentos.service.ts`, against the vehicle's previous fill-up), and dashboard alerts, which are computed on read from maintenance/tires/CNH-expiry/anomalous-fuel data rather than stored as their own table.

### Cross-app conventions
- Both apps: Angular 21, standalone components + signals (no NgModules, no RxJS-first state), TypeScript, `.prettierrc` with `singleQuote: true` (mobile also sets `printWidth: 100` and an Angular parser override for `*.html`).
- Portuguese is the UI and domain-model language throughout (routes, field names, copy). Keep new code consistent with this rather than switching to English.
- No shared/linked package between `vetor-app-web`, `vetor-app-mobile`, and `vetor-backend` — treat them as three independent apps that happen to live in one repo.
