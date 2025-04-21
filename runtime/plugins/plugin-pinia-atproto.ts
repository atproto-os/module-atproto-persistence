import {createPersistedStatePlugin} from 'pinia-plugin-persistedstate-2'
import {useOnline} from '@vueuse/core'
import localforage from 'localforage'
import {getATProtoRecord, putATProtoRecord} from "@owdproject/module-atproto/runtime/utils/utilsAtprotoRepo";
import {deepEqual} from "@owdproject/core/runtime/utils/utilsCommon";

function shouldSyncWithATProto(piniaStoreKey: string) {
    const online = useOnline()
    const {$atproto} = useNuxtApp()

    if (!online.value) {
        return false
    }

    if (!$atproto.agent.account?.assertDid) {
        return false
    }

    if (!determineATProtoCollectionName(piniaStoreKey)) {
        return false
    }

    return true
}

function determineATProtoCollectionName(piniaStoreKey: string) {
    if (piniaStoreKey.startsWith('owd/application')) {
        return 'org.owdproject.application'
    }
}

export default defineNuxtPlugin({
    name: 'owd-plugin-pinia-atproto',
    dependsOn: ['owd-plugin-atproto'],
    async setup() {
        const pinia = usePinia()
        const {$atproto} = useNuxtApp()

        pinia.use(
            createPersistedStatePlugin({
                persist: false,
                storage: {
                    getItem: async (key) => {
                        const value = await localforage.getItem(key)

                        if (!shouldSyncWithATProto(key)) {
                            return value
                        } else {
                            const collectionName = determineATProtoCollectionName(key)

                            return getATProtoRecord(
                                $atproto.agent.account,
                                $atproto.agent.account?.assertDid as string,
                                collectionName as string,
                                key.replaceAll('/', ':')
                            ).catch(() => {
                                // fallback returning local value
                                return value
                            })
                        }
                    },
                    setItem: async (key, value) => {
                        const oldValue = await localforage.getItem(key)
                        await localforage.setItem(key, value)

                        if (!shouldSyncWithATProto(key)) {
                            return value
                        } else {
                            if (deepEqual(toRaw(value), toRaw(oldValue))) {
                                return
                            }

                            const collectionName = determineATProtoCollectionName(key)

                            return putATProtoRecord(
                                $atproto.agent.account,
                                $atproto.agent.account?.assertDid as string,
                                collectionName as string,
                                key.replaceAll('/', ':'),
                                value
                            )
                        }

                        return value
                    },
                    removeItem: async (key) => {
                        const online = useOnline()
                        await localforage.removeItem(key)

                        if (!key.startsWith('owd/')) {
                            return
                        }

                        return
                    },
                },
            }),
        )
    }
})