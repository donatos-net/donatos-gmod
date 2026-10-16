# AGENTS.md - Donatos GMod Addon Project

## Project Overview

Donatos is a Garry's Mod donation/shop addon with:

1. Backend logic written in tlua (typed Lua, `@tlua/cli`) and compiled to Lua
2. A React web UI rendered inside a GMod `DHTML` panel
3. Shared API contracts: Zod schemas in `api-schema` for the UI, mirrored as tlua types in `lua/main/src/donatos.d.tlua`

This repository is a Bun workspace.

## Workspace Structure

```text
donatos-gmod/
├── bootstrap/                    # Runtime bootstrap addon that downloads/runs bundle.lua
│   └── donatos/lua/autorun/
│       └── donatos_bootstrap.lua
├── api-schema/                   # Zod schemas and server action typings (used by the UI)
│   └── src/
│       ├── api-schema.ts
│       └── server-actions.ts
├── lua/
│   ├── autorun/donatos-dev.lua   # Dev loader: includes lua/main/dist/bundle.lua if present
│   └── main/                     # tlua addon source
│       ├── src/
│       │   ├── donatos.d.tlua    # Globals + API/net contracts (mirror of api-schema)
│       │   ├── donatos/          # Net handlers, API calls, releases, remote updates
│       │   ├── player/           # Player objects (shared + server methods)
│       │   ├── ui/web-panel.tlua # DHTML panel + JS bridge registration
│       │   ├── utils/async.tlua  # Coroutine async: run / await (replaces Promises)
│       │   └── main.tlua, client.tlua, server.tlua  # Entry points
│       ├── tluaconfig.json
│       └── build.ts              # tlua -> out/, packs modules + inlines UI HTML into dist/bundle.lua
├── ui/                           # React + TanStack Router + Query UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── donatos/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── types/
│   └── vite.config.ts
└── package.json                  # Workspace root
```

## Tech Stack

### Backend
- Runtime: Garry's Mod Lua
- Source: tlua (`@tlua/cli`), GMod typings from `@tlua/gmod`
- Async: coroutines (`suspend` functions, `utils/async.tlua`)
- Transport: GMod `net` messages

### Frontend
- React 19
- Vite 7 + `vite-plugin-singlefile`
- TanStack Router (file routes)
- TanStack Query
- Tailwind + Radix/Shadcn-style components
- Bun package manager

## Key Runtime Flows

### 1) Bootstrap and bundle loading
- File: `bootstrap/donatos/lua/autorun/donatos_bootstrap.lua`
- Server:
  - Fetches release metadata from `https://donatos.net/api/game-server/gmod/addon`
  - Downloads `bundle.lua` for newest release when needed
  - Stores server bundle at `data/donatos/bundle.server.txt`
  - Sets replicated convars:
    - `donatos_version`
    - `donatos_bundle_sha256`
  - Executes bundle with `RunString`
- Client:
  - Tries HTTP download first
  - Falls back to `donatos_bundle` net transfer from server (compressed, chunked 32KB, sequential by request id)
  - Stores bundle at `data/donatos/bundle.txt`

Important nuance: current bootstrap code verifies SHA256 only for pre-existing local cached bundle path before using it. Newly downloaded HTTP/net bundles are executed without a post-download SHA256 check.

### 2) UI embedding and bridge
- File: `lua/main/src/ui/web-panel.ts`
- Lua creates a `DHTML` panel and registers JS callbacks via `AddFunction` on `window.donatosLua`:
  - `netMessageToServer(callbackId, action, dataJson)`
  - `openUrl(url)`
  - `closeUi()`
  - `requestStateSync()`
- UI bridge in `ui/src/lib/gmod-bridge.ts` installs `window.donatosNative` with:
  - callback resolver/rejector
  - `setState(key, value)` for push updates

### 3) State sync model
- Push from Lua -> UI:
  - `syncConfig` -> `donatosNative.setState('serverConfig', data)`
  - `syncPlayer` -> `donatosNative.setState('playerData', data)`
- UI bridge init: `ui/src/lib/gmod-bridge-init.ts`
  - Registers Query cache setters for `['server-config']` and `['player-data']`
  - Uses mock bridge only when not in-game (`window.donatosLua` missing)

### 4) UI actions (UI -> Lua)
- Typed action contracts: `api-schema/src/server-actions.ts`
- Implemented server handlers: `lua/main/src/donatos/net/server.tlua`
- Currently wired in UI mutations (`ui/src/hooks/use-donatos-mutations.ts`):
  - `purchaseGoods`
  - `activateItem`
  - `freezeActiveItem`
  - `unfreezeActiveItem`

## UI Structure

### Routes
- `ui/src/routes/donatos.tsx` - layout (header + providers)
- `ui/src/routes/donatos/index.tsx` - redirect to `/donatos/shop`
- `ui/src/routes/donatos/shop.tsx`
- `ui/src/routes/donatos/inventory.tsx`
- `ui/src/routes/donatos/active-items.tsx`

### Main Components
- Header/nav: `ui/src/components/donatos/donatos-header.tsx`
- Shop cards/grid/dialogs:
  - `ui/src/components/donatos/shop-item-card.tsx`
  - `ui/src/components/donatos/shop-items-grid.tsx`
  - `ui/src/components/donatos/shop-purchase-confirm-dialog.tsx`
  - `ui/src/components/donatos/shop-deposit-dialog.tsx`
  - `ui/src/components/donatos/shop-activate-offer-dialog.tsx`
- Inventory: `ui/src/components/donatos/inventory-item-card.tsx`
- Active items: `ui/src/components/donatos/active-item-card.tsx`

## Data Layer

- `ui/src/hooks/use-server-config.ts`
- `ui/src/hooks/use-player-data.ts`
- Mock data source: `ui/src/lib/mock-data.ts`

Behavior:
- In mock mode (`window.__donatosMock === true`), hooks run query functions with simulated delay.
- In-game mode, state is mainly push-driven from Lua bridge; queries are disabled and cache is populated via `setState` callbacks.

## Dev Workflow

## Install deps
```bash
bun install
```

## UI only
```bash
cd ui
bun run dev
```
- Dev URL: `http://localhost:3000/donatos`

## Lua bundle build
```bash
cd lua/main
bun run check   # type-check only
bun run build
```
- `build` runs `tlua` into `out/` (one `.lua` per module), builds the UI, and packs
  everything into `lua/main/dist/bundle.lua` behind a bundle-local `require`
  (tlua has no bundler). `$VERSION$`-style placeholders are substituted in the
  `meta` module only, from `DONATOS_ADDON_VERSION`, `GITHUB_RUN_NUMBER`, `GITHUB_SHA`;
  a local build has an empty version and skips update checks.
- tlua notes: top-level types are global, `local type` is module-private; there is no
  `local suspend function` declaration, so module-private suspend functions are written
  `local f = suspend function(...) ... end`.

## Local GMod dev loader
- `lua/autorun/donatos-dev.lua` includes `main/dist/bundle.lua` if it exists, which is useful for local iteration.

## Conventions and Notes

1. Keep API contract updates synchronized across:
- `api-schema/src/api-schema.ts`
- `api-schema/src/server-actions.ts`
- `lua/main/src/donatos.d.tlua` (the tlua mirror of both)
- Lua net handlers (`lua/main/src/donatos/net/server.tlua`)
- UI mutations/hooks (`ui/src/hooks/*`)

2. UI is designed for Chromium 86 target (see `ui/vite.config.ts`), matching GMod's embedded browser constraints.

3. Do not assume mock-mode behavior equals in-game behavior. In-game state arrives through `requestStateSync` + push updates, not normal HTTP fetching.

4. If adding new UI -> Lua action, update both:
- TS typing in `api-schema/src/server-actions.ts` and `DonatosServerActions` in `lua/main/src/donatos.d.tlua`
- Lua server action handler map in `lua/main/src/donatos/net/server.tlua`
