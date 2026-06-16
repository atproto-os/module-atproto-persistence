<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/201536780?s=160&v=4" />
</p>
<h1 align="center">ATProto Persistence Module</h1>
<h3 align="center">
  Hybrid Pinia persistence for Open Web Desktop: local-first with AT Protocol sync.
</h3>

## Overview

This module extends the Open Web Desktop persistence layer with AT Protocol
support. Desktop state (windows, app positions, app settings) is stored locally
via `localforage` (IndexedDB) and optionally synced to the user's AT Protocol
repository as lexicon records.

When a user visits another actor's desktop (e.g. `/actor/<did>`), the module
fetches that actor's state from their ATProto repository and hydrates the Pinia
stores before rendering.

## Features

- Local-first storage via `localforage` (IndexedDB)
- Transparent sync to the AT Protocol repo on every Pinia state change
- Reads a remote actor's desktop state for public desktop viewing
- Dual-prefix compatibility: migrates legacy `owd/` Pinia key prefixes to `desktop/` automatically
- Selective sync: only stores that map to AT Proto collections are synced remotely

## Requirements

- `@owdproject/core` ≥ 3.4.0
- `@owdproject/module-atproto` ≥ 0.0.1

## Installation

```bash
pnpm desktop add module-atproto-persistence
```

## Configuration

```ts
// desktop/desktop.config.ts
export default defineDesktopConfig({
  atprotoPersistence: {
    // When true, load the desktop owner's remote state on app mount
    // (in addition to loading it when navigating to /actor/<did>)
    loadOwnerDesktopOnMounted: false,
  },
})
```

## How it works

### Local storage

All Pinia stores with `persistedState: { persist: true }` are stored locally
in IndexedDB via `localforage`. This is the primary storage layer and always
takes effect regardless of AT Protocol session state.

### Remote sync (AT Protocol)

When the user is logged in (`useAtprotoSession().isLogged`), every `setItem`
call checks whether the Pinia store key maps to a known AT Proto collection.
If it does, the state is written to the user's AT Protocol repository via
`com.atproto.repo.putRecord`.

The mapping is defined in `parseAtprotoStoreKey` (see table below).

### Remote hydration

When navigating to `/actor/<did>` (or on mount when `loadOwnerDesktopOnMounted`
is true), the module fetches the actor's desktop state from their AT Protocol
repository via `com.atproto.repo.getRecord` / `com.atproto.repo.listRecords`,
and pre-populates the state map used by the Pinia persistence plugin.

## AT Protocol collections

| Pinia store id | AT Proto collection | rkey |
|---|---|---|
| `desktop` | `org.owdproject.desktop` | `self` |
| `desktop/application/<appId>/windows` | `org.owdproject.application.windows` | `<appId>` |
| `desktop/application/<appId>/meta` | `org.owdproject.application.meta` | `<appId>` |

> **Backward compatibility**: legacy `owd/` Pinia key prefixes (OWD < 3.4) are
> automatically normalised to `desktop/` before the AT Proto mapping is applied.
> No data loss occurs during the migration.

Extension modules that store data in AT Proto should use `desktop/<module>/...`
Pinia ids and add their own collection entries to `parseAtprotoStoreKey` if needed.

## Relation to `@owdproject/module-persistence`

`@owdproject/module-persistence` is the base persistence module and uses
`idb-keyval` for simple IndexedDB key/value storage.

This module replaces that layer entirely with a custom storage adapter based on
`localforage` that adds the AT Protocol sync logic. **Do not install both modules**
in the same desktop — this module already provides local persistence.

## License

This module is released under the [MIT License](LICENSE).
