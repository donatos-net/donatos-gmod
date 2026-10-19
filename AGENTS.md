# AGENTS.md - Donatos GMod Addon

Garry's Mod donation/shop addon. Addon logic and the in-game VGUI menu are written in tlua (typed
Lua, `@tlua/cli`) and compiled to one Lua bundle; API and net contracts are tlua types in
`lua/main/src/donatos.d.tlua`. A Bun workspace.

## Layout

```text
bootstrap/donatos/lua/autorun/donatos_bootstrap.lua  # Downloads and runs bundle.lua
lua/autorun/donatos-dev.lua    # Dev loader: includes lua/main/dist/bundle.lua if present
lua/main/
├── src/
│   ├── donatos.d.tlua         # Globals + API/net contracts
│   ├── donatos/               # API client, net handlers, releases, update poll, image relay
│   ├── player/                # Player objects (shared + server), saved active items
│   ├── ui/                    # VGUI menu (client only): theme, widgets, views, shop, items, history...
│   ├── utils/                 # async (coroutines), http, cache (SQLite), state, log
│   └── main.tlua, client.tlua, server.tlua  # Entry points
├── test/                      # LuaJIT tests of the compiled server modules
└── build.ts                   # tlua -> out/, packs modules into dist/bundle.lua
mise.toml                      # bun, plus luajit + sqlite for the tests
```

## Runtime

### Bundle loading
- The server bootstrap fetches releases from `https://donatos.net/api/game-server/gmod/addon`,
  stores the bundle in `data/donatos/bundle.server.txt`, sets the replicated `donatos_version` /
  `donatos_bundle_sha256` convars and runs it with `RunString`.
- Clients download over HTTP, falling back to the `donatos_bundle` net transfer (compressed, 32KB
  chunks), and check every bundle against `donatos_bundle_sha256` before running it.
- Images work the same way: saved by the API's `id` in `data/donatos/img/`, downloaded from the
  site, else relayed by the server over `donatos_image` (`server:get-image`, 32KB chunks).
- The bootstrap ships in the addon zip and isn't auto-updated: changes to it reach only servers
  that reinstall.

### HTTP and outages
- `utils/http.tlua` (and the bootstrap) send with the reqwest or CHTTP module when installed,
  GMod's `HTTP` otherwise. A request fails after `timeout` (60s by default) on our own timer.
- `donatos/server-api.tlua`: an outage is a request that doesn't reach the API (transport error,
  timeout, a proxy's 502/503/504). It is logged once at each end, callers get
  `serverApi.UNAVAILABLE`, and the replicated `donatos_api_down` makes the menu's loading views
  say the service is down. Other statuses fail only that request. Reads a join waits on
  (`get-player`, `get-config`, `get-updates:v2`) time out after 15s; purchases and activations
  keep 60s so one the API may still finish isn't reported failed early.
- `utils/cache.tlua` keeps JSON in SQLite (`donatos_cache`) by key. Each player load saves their
  active items, and each config load the config with the bundle version. During an outage a
  joining player gets their saved, unexpired items (join handlers, SAM ranks, `HasActiveItem`;
  `IsLoaded()` stays false), and a starting server the saved config if the same version saved it.
- The API drops expired items only at a player's next load, so each player has one timer
  (`scheduleExpiry`) for their soonest expiry within a day: it drops the item, takes back its SAM
  rank (join handlers don't run again) and syncs the client.

### State sync
- The server pushes `syncConfig` (-> `state.remoteConfig.value`) and `syncPlayer` (->
  `LocalPlayer():Donatos()._remoteData`) over the `donatos` net message; both refresh the menu.
  Clients send `requestSync` on load and on `InitPostEntity`.
- Synced data is the API's, copied by `donatos/client-view.tlua` with what only the server knows
  marked on it (`unavailable`, from `item.availability`). The server alone decides what can be
  bought or activated; the menu only shows the flags.

### Menu
- `ui/menu.tlua` (`open(tab)`, `refresh()`): opened by the `donatos` command, F6
  (`config.menuKeyBind`), the context-menu icon, `donatos.OpenUI(tab)` and the `openUi` message.
  The frame is built once and kept hidden; each render rebuilds the top bar and page from state.
- Pages: shop, «Мои предметы», «История». Layout uses blocks (`{ panel, layout(width) -> height }`)
  from `widgets.tlua` rather than docking. Dialogs stack (`widgets.dialogHost`).
- Menu actions: `donatos.NetMessageToServer(action, data, callback)`, typed by
  `DonatosServerActions`, handled in `donatos/net/server.tlua`.
- Scroll areas are our own (`widgets.scroll`): servers patch `DVScrollBar`.

## Theme and drawing
- Colour schemes (`ocean`, `emerald`, `amber`, `graphite`, `light`; convar `donatos_color_scheme`)
  follow HeroUI v3: its light/dark theme in `theme.tlua` plus an accent, with HeroUI's oklab mixes.
  `theme.setScheme` refills `theme.colors` in place, so scheme colours must not be cached at
  module level.
- GMod crushes dark greys (colours go through `shown(r, g, b)`), blends alpha in linear light
  (declare web alphas with `translucent(...)`, scale with `theme.fade`), and aliases
  `draw.RoundedBox` (use `theme.box` / `ring` / `outlined`).

## Dev workflow
```bash
mise install && bun install
cd lua/main
bun run check   # type-check
bun run build   # dist/bundle.lua
bun run test    # runs test/*.test.lua on LuaJIT (`bun run test player` for one)
```
- `build` packs `out/` behind a bundle-local `require`; `$VERSION$`-style placeholders in `meta`
  come from `DONATOS_ADDON_VERSION`, `GITHUB_RUN_NUMBER`, `GITHUB_SHA` (a local build has an empty
  version and skips update checks). CI publishes a release on every push to main, after the tests.
- Tests: `test/harness.lua` stubs GMod, runs timers on a fake clock (`advance`) and backs `sql`
  with SQLite through the sqlite3 CLI; a test stubs other modules with `package.loaded`.
- tlua: top-level types are global, `local type` is module-private; module-private suspend
  functions are written `local f = suspend function(...) ... end`.

## Conventions
1. Keep contracts in sync: `donatos.d.tlua`, the net handlers (`net/server.tlua`,
   `net/client.tlua`) and the menu pages that call them. A new menu action goes in
   `DonatosServerActions` and the handler map.
2. A client can run an older bundle while it fetches a new one, so `DonatosClientMessages` only
   gain optional fields.
3. The game API deploys before a bundle that needs it, and describes what the menu shows: payment
   methods are buttons from `server:create-order`'s `methods`, and a method without a `url` shows
   the screen `server:payment-method-link` returns. A new method is an API change only; the menu
   skips what it doesn't recognise.
4. The menu is client-only: what it shows arrives through `syncConfig` / `syncPlayer`, a net
   callback, or (whether the API is down) `donatos_api_down`.
5. Size with `theme.px(...)` (900px-high reference) and fonts with `theme.font(...)`.
