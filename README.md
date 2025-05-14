<p align="center">
  <img width="160" height="160" src="https://avatars.githubusercontent.com/u/201536780?s=160&v=4" />
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

Then, define it in your desktop configuration:

```ts
// desktop/owd.config.ts
export default defineNuxtConfig({
  modules: ['@owd-client/module-pinia-atproto']
});
```

## Features
- Configures `pinia-plugin-persistedstate-2` to use `atproto`
- Enables persistent storage for Pinia stores
- Works seamlessly with Nuxt

## License

This module is released under the [MIT License](LICENSE).
