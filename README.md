<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/201536780?s=160&v=4" />
</p>
<h1 align="center">ATProto Persistence Module</h1>
<h3 align="center">
  Hybrid Pinia persistence for Open Web Desktop: local-first with AT Protocol sync.
</h3>

## Overview

This module registers a Pinia persisted-state adapter backed by **IndexedDB**
(`idb-keyval`) with optional sync to the user's AT Protocol repository. It
replaces `@owdproject/module-persistence` — **do not install both** in the same
desktop.

Boot order is handled without core coupling: the plugin runs in Nuxt's **pre**
phase (registers the adapter only). Remote hydration runs **lazily** on the first
`getItem`, after the `atproto` OAuth plugin has finished init. Core and apps
already await `$persistedState.isReady()` before restoring windows.

## Requirements

- `@owdproject/core` ^3.4.0
- `@owdproject/module-atproto` (provides OAuth session and agents)

## Installation

```bash
pnpm desktop add module-atproto-persistence
```

## Configuration

```ts
// desktop/desktop.config.ts
export default defineDesktopConfig({
  modules: [
    '@owdproject/module-atproto',
    '@owdproject/module-atproto-persistence',
  ],
  atprotoPersistence: {
    // Load atprotoDesktop.owner.did remote state on boot (not only /actor/:did)
    loadOwnerDesktopOnMounted: false,
  },
})
```

## Actor resolution (remote hydrate)

On first store read, remote state is fetched once per boot when an actor DID is
resolved:

1. Route `/actor/:did` — view another actor's desktop
2. Logged-in session — `session.sub`
3. `loadOwnerDesktopOnMounted: true` — `atprotoDesktop.owner.did`
4. Otherwise — IndexedDB only

## AT Protocol collections

| Pinia store id | AT Proto collection | rkey |
|---|---|---|
| `desktop` | `org.owdproject.desktop` | `self` |
| `desktop/application/<appId>/windows` | `org.owdproject.application.windows` | `<appId>` |
| `desktop/application/<appId>/meta` | `org.owdproject.application.meta` | `<appId>` |

When logged in, mapped keys are written to the repo on change (`putRecord`).
Unmapped keys stay local-only.

## License

This module is released under the [MIT License](LICENSE).
