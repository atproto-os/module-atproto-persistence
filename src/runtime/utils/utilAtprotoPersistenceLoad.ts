import { useAtprotoSession } from '#imports'
import { useRouter, useRuntimeConfig } from 'nuxt/app'
import { loadActorDesktopStateMap } from './utilAtprotoApplicationStates'

const ATPROTO_READY_TIMEOUT_MS = 2000
const ATPROTO_READY_POLL_MS = 10

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Wait until the nuxt-atproto plugin has finished OAuth init (or timeout as guest). */
export async function waitForAtprotoReady(nuxtApp: any): Promise<void> {
  const deadline = Date.now() + ATPROTO_READY_TIMEOUT_MS

  while (Date.now() < deadline) {
    const $atproto = nuxtApp.$atproto
    if ($atproto && $atproto.status.value !== 'initializing') {
      return
    }
    await sleep(ATPROTO_READY_POLL_MS)
  }
}

export async function resolveRestoreActorDid(nuxtApp: any): Promise<string | undefined> {
  const router = nuxtApp.runWithContext(() => useRouter())
  await router.isReady()

  const routeDid = router.currentRoute.value.params.did
  if (typeof routeDid === 'string' && routeDid.length > 0) {
    return routeDid
  }

  const { isLogged, session } = nuxtApp.runWithContext(() => useAtprotoSession())
  if (isLogged.value && session.value?.sub) {
    return session.value.sub
  }

  const runtimeConfig = nuxtApp.runWithContext(() => useRuntimeConfig())
  const desktop = runtimeConfig.public.desktop as {
    atprotoPersistence?: { loadOwnerDesktopOnMounted?: boolean }
    atprotoDesktop?: { owner?: { did?: string } }
  }

  if (desktop.atprotoPersistence?.loadOwnerDesktopOnMounted) {
    return desktop.atprotoDesktop?.owner?.did
  }

  return undefined
}

let actorStatesPromise: Promise<Record<string, unknown>> | null = null

async function loadActorStatesOnce(nuxtApp: any): Promise<Record<string, unknown>> {
  await waitForAtprotoReady(nuxtApp)

  const actorDid = await resolveRestoreActorDid(nuxtApp)
  if (!actorDid) {
    return {}
  }

  try {
    const states = await loadActorDesktopStateMap(nuxtApp, actorDid)
    return states
  } catch (err) {
    return {}
  }
}

/** One remote fetch per boot; subsequent getItem calls reuse the same promise. */
export function ensureActorStatesLoaded(nuxtApp: any): Promise<Record<string, unknown>> {
  if (!actorStatesPromise) {
    actorStatesPromise = loadActorStatesOnce(nuxtApp)
  }
  return actorStatesPromise
}
