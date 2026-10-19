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
│       │   │   ├── theme.tlua    # HeroUI v3 colours, fonts, scale, rounded boxes, icons
│       │   │   ├── widgets.tlua  # Layout blocks, pill buttons, chips, switch, search, dialogs
│       │   │   ├── views.tlua    # Page context, formatting, empty states, top-up
│       │   │   ├── shop.tlua     # Shop page: category bar, cards, search; item dialog with its image carousel
│       │   │   ├── markdown.tlua # Goods descriptions in a Markdown subset: parse, plain text, painted block
│       │   │   ├── images.tlua   # Goods images, payment logos: downloaded once into data/donatos/img/, loaded as materials
│       │   │   ├── gallery.tlua  # Goods pictures: item dialog carousel and full-screen viewer, with swipe
│       │   │   ├── items.tlua    # «Мои предметы»: active + inventory items, gift / freeze
│       │   │   ├── history.tlua  # «История»: balance changes as a HeroUI table, paged
│       │   │   ├── menu.tlua     # Window, gradient top bar, pages; open / refresh
│       │   │   └── toast.tlua    # Toasts drawn in DrawOverlay (over HUD and menu, no input)
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
- HTTP: `utils/http.tlua` (and the bootstrap) send with the reqwest or CHTTP binary module when
  the server has one installed (servers add them when GMod's own HTTP can't reach the API), with
  GMod's `HTTP` otherwise; all three take `HTTP`'s arguments

### Menu
- GMod VGUI: `EditablePanel` / `DPanel` / `DButton` / `DMenu` / `DTextEntry`,
  all painted by `ui/theme.tlua` helpers (HeroUI v3's look, in the player's colour scheme)
  (scroll areas are our own panel in `widgets.scroll`, not `DScrollPanel`: servers patch
  `DVScrollBar` for smooth scrolling, and that fought our wheel glide)
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

Images (goods pictures, payment logos) follow the same idea. The API gives each an `id` beside
its `url`; `ui/images.tlua` saves files by id, downloads them from the site, and when that fails
asks the server for the id over `donatos_image` (`donatos/image-relay.tlua`), which gets the file
from the API (`server:get-image`, which resolves only its own ids) and sends it in 32KB chunks,
each requested by the client. After one such failure the rest of the
session goes through the server directly.

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
- Three pages: the shop (every good in its category's section, 4 card columns, a chip bar that
  jumps between sections and follows the scroll, search), «Мои предметы» (active and
  inventory items) and «История» (balance changes from `getHistory`, paged). The old `inventory` / `activeItems` tab names open «Мои предметы».
- A card opens the item dialog: description on the left (a Markdown subset: headings, lists,
  quotes, rules, code, bold / italic, links, and `[text](lua:code)` links that run
  client Lua; cards and search use its plain text), purchase on the right, with the
  "Активировать сразу" switch (purchase, then `activateItem`).
- Goods added in the last 7 days (`createdAt` from `server:get-config`) show a "NEW" ribbon across
  their card's top-right corner and a chip in their dialog.
- Layout uses blocks (`{ panel, layout(width) -> height }`) from `widgets.tlua` rather than
  docking, so cards and wrapped text size to the available width.
- Dialogs (`widgets.dialogHost`) sit over the frame; actions answer through net callbacks.
  `show(dialog, true)` / `showCustom(build, true)` stack a dialog over the current one, which
  comes back as it was when the top one closes (Escape closes the top one).
- Top-up (`views.topUp(ctx, preset?)`, from the top bar and the item dialog's «Пополнить на N»):
  a stacked «Пополнение баланса» dialog (amount, method when gm-donate is on, receipt email and
  terms), then our order's SBP QR code (`createOrder` -> `server:create-order`, drawn from the
  API's module grid) or gm-donate's page, until the synced balance grows. The API remembers the
  receipt email when asked and sends game servers only a masked copy (`player.receiptEmail`).

### 3) State sync model
- The server pushes state to clients over the `donatos` net message:
  - `syncConfig` -> `state.remoteConfig.value`
  - `syncPlayer` -> `LocalPlayer():Donatos()._remoteData`
  - both call `menu.refresh()`, which re-renders if the menu is open
  - a `syncPlayer` whose balance went up (not the first one) shows a toast
- Both are the API's data as `donatos/client-view.tlua` sends it: copies on which the server marks
  what only it knows. Goods variants it can't sell and inventory items it can't activate carry
  `unavailable` (a reason, from `item.availability`: one-time goods whose item the server's config
  doesn't register). The server alone decides: `purchaseGoods` and `activateItem` check the same
  rule, and the menu only shows the flags. Items registered later (autorefresh, other addons)
  sync every client again.
- The client sends `requestSync` on load and on `InitPostEntity`.

### 4) Menu actions (client -> server)
- `donatos.NetMessageToServer(action, data, callback)` (`lua/main/src/donatos/net.tlua`)
- Typed contracts: `DonatosServerActions` in `lua/main/src/donatos.d.tlua`
- Handlers: `lua/main/src/donatos/net/server.tlua`
- Used by the menu: `purchaseGoods`, `activateItem`, `giftItem`, `getOnlinePlayers`,
  `freezeActiveItem`, `unfreezeActiveItem`, `createOrder`, `createIgsPaymentUrl`, `getHistory`

## Colour schemes

Each player picks the menu's scheme in the account popover (the avatar-and-balance pill in the top
bar, which also holds the top-up): `ocean` (default), `emerald`, `amber`, `graphite` or `light`,
kept in the archived client convar `donatos_color_scheme`. A scheme is themed the way HeroUI v3
does it: its light or dark theme (`HEROUI_LIGHT` / `HEROUI_DARK` in `theme.tlua`, the values of
`@heroui/styles`' `themes/default/variables.css` in sRGB) plus an accent and the text on it; the
hover, soft and soft-text shades are HeroUI's `color-mix(in oklab, ...)` formulas (`mixOklab`).
The top bar's gradient and a dark scheme's grey tint are ours. `theme.setScheme` refills
`theme.colors` in place and the popover re-renders the bar and page (staying open over them), so
colours derived from the scheme must not be cached at module level (ones that are the same in
every scheme, made with `theme.overDark`, can be). The top bar keeps white text and a white
selection in every scheme (`colors.bar*`); text on an accent fill is `colors.accentInk`.

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

2. A client can run an older bundle while it fetches a new one, so `DonatosClientMessages` only
gain optional fields; a message's shape never changes.

3. The game API (`server:*` in `donatos.d.tlua`) deploys before a bundle that needs it, and
describes what the menu shows instead of the menu knowing it: payment methods are buttons from
`server:create-order`'s `methods`, and what one without a `url` shows is the screen
`server:payment-method-link` returns (a QR code with its title and text, or a URL to open). A new
method, or a change to what one shows, is an API change only; the menu skips what it doesn't
recognise (an unknown icon, bad colours) rather than failing.

4. If adding a new menu -> server action, add it to `DonatosServerActions` and to the handler
map in `lua/main/src/donatos/net/server.tlua`.

5. The menu is client-only; anything it shows must arrive through `syncConfig` / `syncPlayer`
or a net callback.

6. Size things with `theme.px(...)` (scaled from a 900px-high reference) and fonts with
`theme.font(...)`; both are rebuilt on `OnScreenSizeChanged`.
