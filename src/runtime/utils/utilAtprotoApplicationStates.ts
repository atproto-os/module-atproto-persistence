import { useAtprotoAgent, useAtprotoSession } from '#imports'

/** Resolve PDS endpoint via PLC directory (Bluesky); custom PDSs use the same DID document shape. */
export async function resolveActorServiceEndpoint(did: string): Promise<string> {
  const response = await fetch(`https://plc.directory/${did}`)

  if (!response.ok) {
    throw new Error('Failed to fetch profile service endpoint')
  }

  const data = await response.json()

  return data.service[0].serviceEndpoint
}

/**
 * Maps a Pinia store id to an AT Protocol collection and rkey.
 *
 * Key format → AT Proto mapping:
 * - `desktop/application/<appId>/windows` → collection: `org.owdproject.application.windows`, rkey: `<appId>`
 * - `desktop/application/<appId>/meta`    → collection: `org.owdproject.application.meta`,    rkey: `<appId>`
 * - `desktop` (or `desktop/<sub>`)        → collection: `org.owdproject.desktop`,              rkey: `self` (or `<sub>`)
 *
 * Returns `null` for keys that are not persisted to AT Proto.
 */
export function parseAtprotoStoreKey(
  key: string,
): { collection: string; rkey: string } | null {
  if (key.startsWith('desktop/application/')) {
    const parts = key.split('/')
    const last = parts[parts.length - 1]

    if (last === 'windows' || last === 'meta') {
      const appId = parts.slice(2, -1).join('/')
      return {
        collection: `org.owdproject.application.${last}`,
        rkey: appId,
      }
    }
  }

  if (key === 'desktop' || key.startsWith('desktop/')) {
    const sub = key.split('/')[1] ?? 'self'
    if (!key.startsWith('desktop/application/')) {
      return {
        collection: 'org.owdproject.desktop',
        rkey: sub,
      }
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
  repo: string,
  collection: string,
  rkey: string,
  record: any,
) {
  return agent.com.atproto.repo.putRecord({
    repo,
    collection,
    rkey,
    record,
  })
}

/**
 * Loads the full desktop state map for a given actor from the AT Protocol
 * repository. Returns a map keyed by Pinia store id (`desktop/` prefix).
 */
export async function loadActorDesktopStateMap(nuxtApp: any, actorDid: string) {
  const { isLogged, session } = nuxtApp.runWithContext(() => useAtprotoSession())
  const isOwner = isLogged.value && session.value?.sub === actorDid

  let actorAgent
  if (isOwner) {
    actorAgent = nuxtApp.runWithContext(() => useAtprotoAgent('authenticated'))
  } else {
    const actorServiceEndpoint = await resolveActorServiceEndpoint(actorDid)
    actorAgent = nuxtApp.runWithContext(() => useAtprotoAgent(actorServiceEndpoint))
  }

  const [
    atprotoActorDesktopList,
    atprotoApplicationWindowsList,
    atprotoApplicationMetaList,
  ] = await Promise.allSettled([
    listAtprotoApplicationStateRecords(
      actorAgent,
      actorDid,
      'org.owdproject.desktop',
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

  const stateMap: Record<string, any> = {}

  if (atprotoActorDesktopList.status === 'fulfilled') {
    for (const record of atprotoActorDesktopList.value) {
      const rkey = record.uri.split('/').pop()
      const piniaKey = rkey === 'self' ? 'owd/desktop' : `owd/desktop/${rkey}`
      stateMap[piniaKey] = record.value
    }
  }

  if (atprotoApplicationWindowsList.status === 'fulfilled') {
    for (const record of atprotoApplicationWindowsList.value) {
      const appId = record.uri.split('/').pop()
      stateMap[`owd/application/${appId}/windows`] = {
        windows: record.value.windows,
      }
    }
  }

  if (atprotoApplicationMetaList.status === 'fulfilled') {
    for (const record of atprotoApplicationMetaList.value) {
      const appId = record.uri.split('/').pop()
      stateMap[`owd/application/${appId}/meta`] = {
        ...record.value,
      }
    }
  }

  return stateMap
}
