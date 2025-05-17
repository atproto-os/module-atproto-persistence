import { useAgent, resolveActorServiceEndpoint } from '#imports'
import { useDesktopStore } from '@owdproject/core/runtime/stores/storeDesktop'
import { useApplicationWindowsStore } from '@owdproject/core/runtime/stores/storeApplicationWindows'
import { useApplicationMetaStore } from '@owdproject/core/runtime/stores/storeApplicationMeta'

export function parseAtprotoStoreKey(
  key: string,
): { collection: string; rkey: string } | null {
  if (!key.startsWith('owd/')) return null

  const parts = key.split('/')

  if (parts[1] === 'application') {
    const last = parts[parts.length - 1]
    if (last === 'windows' || last === 'meta') {
      const nome = parts.slice(2, -1).join('/')
      return {
        collection: `org.owdproject.application.${last}`,
        rkey: nome,
      }
    }
  }

  // owd/desktop
  if (parts[1] === 'desktop') {
    const rkey = parts[2] ?? 'self'
    return {
      collection: 'org.owdproject.desktop',
      rkey,
    }
  }

  return null
}

export function listAtprotoApplicationStateRecords(
  agent: any,
  repo: string,
  collection: string,
) {
  return agent.com.atproto.repo
    .listRecords({
      repo,
      collection,
    })
    .then((response: any) => response.data)
    .then((data: any) => data.records)
    .catch(() => [])
}

export function getAtprotoApplicationState(
  agent: any,
  repo: string,
  collection: string,
  rkey: string,
) {
  return agent.com.atproto.repo.getRecord({
    repo,
    collection,
    rkey,
  })
}

export function putAtprotoApplicationState(
  agent: any,
  collection: string,
  rkey: string,
  record: any,
) {
  return agent.com.atproto.repo.putRecord({
    repo: agent?.assertDid as string,
    collection,
    rkey,
    record,
  })
}

/**
 * Load actor desktop
 *
 * @param actorDid
 */
export async function loadActorDesktop(actorDid: string) {
  const actorServiceEndpoint = await resolveActorServiceEndpoint(actorDid)
  const actorAgent = useAgent(actorServiceEndpoint)

  const [
    atprotoActorDesktopRecord,
    atprotoApplicationWindowsList,
    atprotoApplicationMetaList,
  ] = await Promise.allSettled([
    getAtprotoApplicationState(
      actorAgent,
      actorDid,
      'org.owdproject.desktop',
      'self',
    ),
    listAtprotoApplicationStateRecords(
      actorAgent,
      actorDid,
      'org.owdproject.application.windows',
    ),
    listAtprotoApplicationStateRecords(
      actorAgent,
      actorDid,
      'org.owdproject.application.meta',
    ),
  ])

  // load actor applications desktop settings
  if (atprotoActorDesktopRecord.status === 'fulfilled') {
    // todo validate

    if (
      atprotoActorDesktopRecord.value &&
      atprotoActorDesktopRecord.value.data
    ) {
      useDesktopStore().$patch(atprotoActorDesktopRecord.value.data.value.state)
    }
  }

  let applicationWindowsStore
  let applicationMetaStore

  // load actor applications windows
  if (atprotoApplicationWindowsList.status === 'fulfilled') {
    for (const atprotoApplicationWindowRecord of atprotoApplicationWindowsList.value) {
      const atprotoApplicationId = atprotoApplicationWindowRecord.uri
        .split('/')
        .pop()

      applicationWindowsStore = useApplicationWindowsStore(atprotoApplicationId)

      applicationWindowsStore.$patch({
        windows: atprotoApplicationWindowRecord.value.windows,
      })
    }
  }

  // load actor applications meta
  if (atprotoApplicationMetaList.status === 'fulfilled') {
    for (const atprotoApplicationMetaRecord of atprotoApplicationMetaList.value) {
      const atprotoApplicationId = atprotoApplicationMetaRecord.uri
        .split('/')
        .pop()

      applicationMetaStore = useApplicationMetaStore(atprotoApplicationId)()

      applicationMetaStore.$patch({
        ...atprotoApplicationMetaRecord.value,
      })
    }
  }
}
