import {createPersistedStatePlugin} from 'pinia-plugin-persistedstate-2'
import {useOnline} from '@vueuse/core'
import {deepEqual} from "@owdproject/core/runtime/utils/utilCommon";
import {defineNuxtPlugin, useNuxtApp} from "nuxt/app"
import {toRaw} from "vue"
import {usePinia} from "#imports"
import * as localforage from 'localforage'
import {
    getAtprotoApplicationState,
    putAtprotoApplicationState,
    listAtprotoApplicationStateRecords, parseAtprotoStoreKey
} from "../utils/utilAtprotoApplications";


function shouldSyncWithATProto(
    piniaStoreKey: string,
    atprotoApplicationsRecords?: {
        windows: any[],
        meta: any[],
    }
) {
    const online = useOnline();
    const {$atproto} = useNuxtApp();

    if (!online.value || !$atproto.session.value) return false;

    const parsed = parseAtprotoStoreKey(piniaStoreKey);

    if (!parsed) return false;

    const { collection, rkey } = parsed;

    if (collection === 'org.owdproject.application.windows' && atprotoApplicationsRecords?.windows) {
        return atprotoApplicationsRecords.windows.some(record => record.uri.endsWith(rkey));
    }

    if (collection === 'org.owdproject.application.meta' && atprotoApplicationsRecords?.meta) {
        return atprotoApplicationsRecords.meta.some(record => record.uri.endsWith(rkey));
    }

    return true;
}

export default defineNuxtPlugin({
    name: 'owd-plugin-pinia-atproto',
    dependsOn: ['atproto', 'owd-plugin-atproto'],
    async setup() {
        const pinia = usePinia()
        const atproto = useAtproto()

        const atprotoApplicationsRecords = {
            windows: atproto.agent.account
                ? await listAtprotoApplicationStateRecords(atproto.agent.account, 'org.owdproject.application.windows')
                : [],
            meta: atproto.agent.account
                ? await listAtprotoApplicationStateRecords(atproto.agent.account, 'org.owdproject.application.meta')
                : []
        }

        pinia.use(
            createPersistedStatePlugin({
                persist: false,
                storage: {
                    getItem: async (piniaKey) => {
                        const piniaValue = await localforage.getItem(piniaKey);
                        const parsed = parseAtprotoStoreKey(piniaKey);

                        if (!parsed || !shouldSyncWithATProto(piniaKey, atprotoApplicationsRecords)) {
                            return piniaValue;
                        }

                        const { collection, rkey } = parsed;

                        return getAtprotoApplicationState(atproto.agent.account, collection, rkey)
                            .then((response) => JSON.stringify(response.data.value))
                            .catch(() => piniaValue);
                    },
                    setItem: async (piniaKey, piniaValue) => {
                        const previousPiniaValue = await localforage.getItem(piniaKey);
                        await localforage.setItem(piniaKey, piniaValue);

                        const parsed = parseAtprotoStoreKey(piniaKey);

                        if (!parsed) {
                            return piniaValue;
                        }

                        const { collection, rkey } = parsed;

                        if (deepEqual(toRaw(piniaValue), toRaw(previousPiniaValue))) {
                            return piniaValue;
                        }

                        return putAtprotoApplicationState(
                            atproto.agent.account,
                            collection,
                            rkey,
                            JSON.parse(piniaValue)
                        );
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