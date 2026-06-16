import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'
import { deepEqual } from '@owdproject/core/runtime/utils/utilCommon'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { toRaw } from 'vue'
import { useAtprotoSession, useAtprotoAgent } from '#imports'

import localforage from 'localforage/src/localforage.js'
import {
  putAtprotoApplicationState,
  parseAtprotoStoreKey,
  loadActorDesktopStateMap,
} from './utils/utilAtprotoApplicationStates'

export default defineNuxtPlugin({
  name: 'desktop-plugin-atproto-persistence',
  dependsOn: ['desktop-plugin-atproto'],
  async setup(nuxtApp) {
    const pinia = nuxtApp.$pinia
    const { isLogged } = useAtprotoSession()
    const runtimeConfig = useRuntimeConfig()
    const router = useRouter()

    let states: Record<string, any> = {}
    let actorDid: string | undefined

    if (router.currentRoute.value.params.did) {
      actorDid = router.currentRoute.value.params.did as string
    } else {
      if (
        runtimeConfig.public.desktop.atprotoPersistence?.loadOwnerDesktopOnMounted
      ) {
        actorDid = runtimeConfig.public.desktop.atprotoDesktop?.owner.did
      }
    }

    if (actorDid) {
      states = await loadActorDesktopStateMap(actorDid)
    }

    pinia.use(
      createPersistedStatePlugin({
        persist: false,
        storage: {
          getItem: async (piniaKey) => {
            if (Object.prototype.hasOwnProperty.call(states, piniaKey)) {
              return JSON.stringify(states[piniaKey])
            }

            return localforage.getItem(piniaKey)
          },
          setItem: async (piniaKey, piniaValue) => {
            const previousPiniaValue = await localforage.getItem(piniaKey)
            await localforage.setItem(piniaKey, piniaValue)

            const atprotoTargetRecord = parseAtprotoStoreKey(piniaKey)

            if (!atprotoTargetRecord || !isLogged.value) {
              return piniaValue
            }

            const { collection, rkey } = atprotoTargetRecord

            if (deepEqual(toRaw(piniaValue), toRaw(previousPiniaValue))) {
              return piniaValue
            }

            const agent = useAtprotoAgent('authenticated')

            return putAtprotoApplicationState(
              agent,
              agent.assertDid,
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
