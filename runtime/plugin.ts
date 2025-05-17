import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'
import { deepEqual } from '@owdproject/core/runtime/utils/utilCommon'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { toRaw } from 'vue'
import { usePinia, useAtproto } from '#imports'

import localforage from 'localforage/src/localforage.js'
import {
  loadActorDesktop,
  putAtprotoApplicationState,
  parseAtprotoStoreKey,
} from './utils/utilAtprotoApplicationStates'

export default defineNuxtPlugin({
  name: 'owd-plugin-atproto-persistence',
  dependsOn: ['owd-plugin-atproto'],
  async setup(nuxt) {
    const pinia = usePinia()
    const atproto = useAtproto()
    const runtimeConfig = useRuntimeConfig()

    if (
      runtimeConfig.public.atprotoPersistence &&
      runtimeConfig.public.atprotoPersistence.loadOwnerDesktopOnMounted
    ) {
      loadActorDesktop(runtimeConfig.public.atprotoDesktop.owner.did)
    }

    pinia.use(
      createPersistedStatePlugin({
        persist: false,
        storage: {
          getItem: async (piniaKey) => {
            return localforage.getItem(piniaKey)
          },
          setItem: async (piniaKey, piniaValue) => {
            const previousPiniaValue = await localforage.getItem(piniaKey)
            await localforage.setItem(piniaKey, piniaValue)

            const atprotoTargetRecord = parseAtprotoStoreKey(piniaKey)

            if (!atprotoTargetRecord || !atproto.agent.account) {
              return piniaValue
            }

            const { collection, rkey } = atprotoTargetRecord

            if (deepEqual(toRaw(piniaValue), toRaw(previousPiniaValue))) {
              return piniaValue
            }

            return putAtprotoApplicationState(
              atproto.agent.account,
              atproto.agent.account.assertDid,
              collection,
              rkey,
              JSON.parse(piniaValue),
            )
          },
          removeItem: async (key) => {
            await localforage.removeItem(key)
          },
        },
      }),
    )
  },
})
