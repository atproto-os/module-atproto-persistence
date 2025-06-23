import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'
import { deepEqual } from '@owdproject/core/runtime/utils/utilCommon'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { toRaw } from 'vue'
import { usePinia, useRouter, useAtproto, useAgent } from '#imports'

import localforage from 'localforage/src/localforage.js'
import {
  putAtprotoApplicationState,
  parseAtprotoStoreKey,
  loadActorDesktopStateMap
} from './utils/utilAtprotoApplicationStates'

export default defineNuxtPlugin({
  name: 'owd-plugin-atproto-persistence',
  dependsOn: ['owd-plugin-atproto'],
  async setup() {
    const pinia = usePinia()
    const atproto = useAtproto()
    const runtimeConfig = useRuntimeConfig()
    const router = useRouter()

    let states = {}
    let actorDid = undefined

    if (router.currentRoute.value.params.did) {
      actorDid = router.currentRoute.value.params.did
    } else {
      if (
        runtimeConfig.public.desktop.atprotoPersistence &&
        runtimeConfig.public.desktop.atprotoPersistence.loadOwnerDesktopOnMounted
      ) {
        actorDid = runtimeConfig.public.desktop.atprotoDesktop.owner.did
      }
    }

    if (actorDid) {
      states = await loadActorDesktopStateMap(runtimeConfig.public.desktop.atprotoDesktop.owner.did)
    }

    pinia.use(
      createPersistedStatePlugin({
        persist: false,
        storage: {
          getItem: async (piniaKey) => {

            if (states.hasOwnProperty(piniaKey)) {
              return JSON.stringify(states[piniaKey])
            }

            return localforage.getItem(piniaKey)
          },
          setItem: async (piniaKey, piniaValue) => {
            const previousPiniaValue = await localforage.getItem(piniaKey)
            await localforage.setItem(piniaKey, piniaValue)

            const atprotoTargetRecord = parseAtprotoStoreKey(piniaKey)

            if (!atprotoTargetRecord || !atproto.isLogged()) {
              return piniaValue
            }

            const { collection, rkey } = atprotoTargetRecord

            if (deepEqual(toRaw(piniaValue), toRaw(previousPiniaValue))) {
              return piniaValue
            }

            const agent = useAgent('private')

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
