import { resolveActorServiceEndpoint, useAtprotoAgent } from '#imports'

/**
 * Maps an ATProto Pinia store key to an AT Protocol collection and rkey.
 *
 * Supports both the current `desktop/` prefix (OWD ≥ 3.4) and the legacy
 * `owd/` prefix for backward compatibility with existing stored data.
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
  // Normalise: strip legacy `owd/` prefix to `desktop/` equivalent
  let normalised = key
  if (key === 'owd/desktop') {
    normalised = 'desktop'
  } else if (key.startsWith('owd/application/')) {
    normalised = key.replace(/^owd\/application\//, 'desktop/application/')
  } else if (key.startsWith('owd/')) {
    normalised = key.replace(/^owd\//, 'desktop/')
  }

  // desktop/application/<appId>/windows|meta
  if (normalised.startsWith('desktop/application/')) {
    const parts = normalised.split('/')
    const last = parts[parts.length - 1]

    if (last === 'windows' || last === 'meta') {
      const appId = parts.slice(2, -1).join('/')
      return {
        collection: `org.owdproject.application.${last}`,
        rkey: appId,
      }
    }
  }

  // desktop (or desktop/<sub>)
  if (normalised === 'desktop' || normalised.startsWith('desktop/')) {
    const sub = normalised.split('/')[1] ?? 'self'
    // Exclude nested paths already handled above
    if (!normalised.startsWith('desktop/application/')) {
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
 * repository. Returns a map keyed by Pinia store id (OWD 3.4 `desktop/` prefix).
 *
 * Fetches three collections in parallel:
 * - `org.owdproject.desktop` → `desktop`
 * - `org.owdproject.application.windows` → `desktop/application/<appId>/windows`
 * - `org.owdproject.application.meta`    → `desktop/application/<appId>/meta`
 */
export async function loadActorDesktopStateMap(actorDid: string) {
  const actorServiceEndpoint = await resolveActorServiceEndpoint(actorDid)
  const actorAgent = useAtprotoAgent(actorServiceEndpoint)

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

  const stateMap: Record<string, any> = {}

  // desktop state — keyed as `desktop` (OWD 3.4 Pinia id)
  if (
    atprotoActorDesktopRecord.status === 'fulfilled' &&
    atprotoActorDesktopRecord.value?.data
  ) {
    stateMap['desktop'] = atprotoActorDesktopRecord.value.data.value
  }

  // windows state
  if (atprotoApplicationWindowsList.status === 'fulfilled') {
    for (const record of atprotoApplicationWindowsList.value) {
      const appId = record.uri.split('/').pop()
      stateMap[`desktop/application/${appId}/windows`] = {
        windows: record.value.windows,
      }
    }
  }

  // meta state
  if (atprotoApplicationMetaList.status === 'fulfilled') {
    for (const record of atprotoApplicationMetaList.value) {
      const appId = record.uri.split('/').pop()
      stateMap[`desktop/application/${appId}/meta`] = {
        ...record.value,
      }
    }
  }

  return stateMap
}
