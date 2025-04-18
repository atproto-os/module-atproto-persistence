# Pinia ATProto for Open Web Desktop

This module enables the usage of `pinia-plugin-persistedstate-2` with `atproto` for storing Pinia state persistently.

## Installation

To install the module, run:

```sh
npm install owd-module-pinia-atproto
```

## Usage

Define the module in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@owd-client/module-pinia-atproto']
});
```

## Features
- Configures `pinia-plugin-persistedstate-2` to use `atproto`
- Enables persistent storage for Pinia stores
- Works seamlessly with Nuxt

## License
Open Web Desktop is licensed under the [GNU General Public License v3](LICENSE).

