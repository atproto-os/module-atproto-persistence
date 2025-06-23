import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'owd-module-atproto-persistence',
    configKey: 'atprotoPersistence',
  },
  defaults: {
    loadOwnerDesktopOnMounted: false,
  },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // set runtime config
    _nuxt.options.runtimeConfig.public.desktop.atprotoPersistence = _options

    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'client',
    })
  },
})
