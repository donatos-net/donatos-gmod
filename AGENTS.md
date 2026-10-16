# AGENTS.md - Donatos GMod Addon Project

## Project Overview

Donatos is a Garry's Mod donation/shop addon with:

1. Addon logic written in tlua (typed Lua, `@tlua/cli`) and compiled to Lua
2. An in-game menu built with GMod VGUI (Derma panels painted by hand), also in tlua
3. API and net contracts as tlua types in `lua/main/src/donatos.d.tlua`

This repository is a Bun workspace.

## Workspace Structure

```text
donatos-gmod/
├── bootstrap/                    # Runtime bootstrap addon that downloads/runs bundle.lua
│   └── donatos/lua/autorun/
│       └── donatos_bootstrap.lua
├── lua/
│   ├── autorun/donatos-dev.lua   # Dev loader: includes lua/main/dist/bundle.lua if present
│   └── main/                     # tlua addon source
│       ├── src/
│       │   ├── donatos.d.tlua    # Globals + API/net contracts
│       │   ├── donatos/          # Net handlers, API calls, releases, remote updates
│       │   ├── player/           # Player objects (shared + server methods)
│       │   ├── ui/               # VGUI menu (client only)
│       │   │   ├── theme.tlua    # HeroUI v3 colours, fonts, scale, rounded boxes, blur, icons
│       │   │   ├── widgets.tlua  # Layout blocks, pill buttons, chips, switch, search, dialogs
│       │   │   ├── views.tlua    # Page context, formatting, page header, empty states, top-up
│       │   │   ├── shop.tlua     # Shop page: category bar, cards, search; item dialog
│       │   │   ├── items.tlua    # «Мои предметы»: active + inventory items, gift / freeze
│       │   │   └── menu.tlua     # Window, gradient top bar, pages; open / refresh
│       │   ├── utils/async.tlua  # Coroutine async: run / await (replaces Promises)
│       │   └── main.tlua, client.tlua, server.tlua  # Entry points
│       ├── tluaconfig.json
│       └── build.ts              # tlua -> out/, packs modules into dist/bundle.lua
└── package.json                  # Workspace root
```

## Tech Stack

### Backend
- Runtime: Garry's Mod Lua
- Source: tlua (`@tlua/cli`), GMod typings from `@tlua/gmod`
- Async: coroutines (`suspend` functions, `utils/async.tlua`)
- Transport: GMod `net` messages

### Menu
- GMod VGUI: `EditablePanel` / `DPanel` / `DButton` / `DScrollPanel` / `DMenu` / `DTextEntry`,
  all painted by `ui/theme.tlua` helpers (HeroUI v3's dark theme over a blurred glass window)
- Bun package manager for the tooling

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

The client checks every bundle (cached, downloaded over HTTP, or received from the server) against
`donatos_bundle_sha256` before running it; an HTTP mismatch falls back to the server transfer.
The bootstrap ships in the addon zip and is not auto-updated: changes to it only reach servers
that reinstall the addon.

### 2) Menu
- Entry: `lua/main/src/ui/menu.tlua` (`open(tab)`, `refresh()`); opened by the `donatos`
  console command, the menu key (`config.menuKeyBind`, F6 by default), the context-menu
  desktop icon, `donatos.OpenUI(tab)` and the server's `openUi` net message.
- The frame (1200x680 design pixels, scaled) is built once and kept hidden between uses
  (removed after 5 idle minutes, or rebuilt on every open when `donatos.dev.enabled`). Each
  render rebuilds the top bar and the current page from state; scroll position is kept per
  page, and the search field keeps its text and focus.
- Two pages: the shop (every good in its category's section, 4 card columns, a chip bar that
  jumps between sections and follows the scroll, search) and «Мои предметы» (active and
  inventory items). The old `inventory` / `activeItems` tab names open «Мои предметы».
- A card opens the item dialog: description on the left, purchase on the right, with the
  "Активировать сразу" switch (purchase, then `activateItem`).
- Layout uses blocks (`{ panel, layout(width) -> height }`) from `widgets.tlua` rather than
  docking, so cards and wrapped text size to the available width.
- Dialogs (`widgets.dialogHost`) sit over the frame; actions answer through net callbacks.

### 3) State sync model
- The server pushes state to clients over the `donatos` net message:
  - `syncConfig` -> `state.remoteConfig.value`
  - `syncPlayer` -> `LocalPlayer():Donatos()._remoteData`
  - both call `menu.refresh()`, which re-renders if the menu is open
- The client sends `requestSync` on load and on `InitPostEntity`.

### 4) Menu actions (client -> server)
- `donatos.NetMessageToServer(action, data, callback)` (`lua/main/src/donatos/net.tlua`)
- Typed contracts: `DonatosServerActions` in `lua/main/src/donatos.d.tlua`
- Handlers: `lua/main/src/donatos/net/server.tlua`
- Used by the menu: `purchaseGoods`, `activateItem`, `giftItem`, `getOnlinePlayers`,
  `freezeActiveItem`, `unfreezeActiveItem`, `createIgsPaymentUrl`

## Drawing notes

GMod's 2D pipeline differs from a browser in ways the theme corrects for:
- Dark greys are crushed (drawing 16 shows 8). Theme colours are written as they should
  appear and lifted through a measured response curve (`shown(r, g, b)` in `theme.tlua`).
- Translucent colours blend in linear light, so a web alpha comes out much stronger (white
  at 24/255 over black shows 86, not 24). Translucent theme colours are declared with the
  web alpha via `translucent(...)`, which converts it; use `theme.fade` to scale them.
- `draw.RoundedBox` corners are aliased; `theme.box` / `theme.ring` / `theme.outlined`
  draw anti-aliased corners from render-target masks.

## Dev Workflow

## Install deps
```bash
bun install
```

## Lua bundle build
```bash
cd lua/main
bun run check   # type-check only
bun run build
```
- `build` runs `tlua` into `out/` (one `.lua` per module) and packs the modules into `lua/main/dist/bundle.lua` behind a bundle-local `require`
  (tlua has no bundler). `$VERSION$`-style placeholders are substituted in the
  `meta` module only, from `DONATOS_ADDON_VERSION`, `GITHUB_RUN_NUMBER`, `GITHUB_SHA`;
  a local build has an empty version and skips update checks.
- tlua notes: top-level types are global, `local type` is module-private; there is no
  `local suspend function` declaration, so module-private suspend functions are written
  `local f = suspend function(...) ... end`.

## Local GMod dev loader
- `lua/autorun/donatos-dev.lua` includes `main/dist/bundle.lua` if it exists, which is useful for local iteration.

## Conventions and Notes

1. Keep contract updates synchronized across:
- `lua/main/src/donatos.d.tlua` (API payloads, `DonatosServerActions`, `DonatosClientMessages`)
- Lua net handlers (`lua/main/src/donatos/net/server.tlua`, `net/client.tlua`)
- The menu pages that call them (`lua/main/src/ui/shop.tlua`, `items.tlua`)

2. If adding a new menu -> server action, add it to `DonatosServerActions` and to the handler
map in `lua/main/src/donatos/net/server.tlua`.

3. The menu is client-only; anything it shows must arrive through `syncConfig` / `syncPlayer`
or a net callback.

4. Size things with `theme.px(...)` (scaled from a 900px-high reference) and fonts with
`theme.font(...)`; both are rebuilt on `OnScreenSizeChanged`.
