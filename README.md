<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/65117737?s=160&v=4" />
</p>
<h1 align="center">ATProto Store Module</h1>
<h3 align="center">
  ATProto Store Module for your Open Web Desktop client.
</h3>

## Overview

This module enables the usage of `pinia-plugin-persistedstate-2` with `atproto`  
for storing Open Web Desktop states persistently on the AT Protocol.

## Installation

To install the module, run:

```sh
npm install @owdproject/module-pinia-atproto
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

## Compatibility

The application is compatible with Open Web Desktop client version `3.0.0-alpha.6`.

## License

Open Web Desktop is released under the [GNU General Public License v3](LICENSE).

