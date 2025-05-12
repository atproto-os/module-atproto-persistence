export function parseAtprotoStoreKey(key: string): { collection: string, rkey: string } | null {
    if (!key.startsWith('owd/')) return null;

    const parts = key.split('/');

    if (parts[1] === 'application') {
        const last = parts[parts.length - 1];
        if (last === 'windows' || last === 'meta') {
            const nome = parts.slice(2, -1).join('/');
            return {
                collection: `org.owdproject.application.${last}`,
                rkey: nome
            };
        }
    }

    // owd/desktop
    if (parts[1] === 'desktop') {
        const rkey = parts[2] ?? 'self';
        return {
            collection: 'org.owdproject.desktop',
            rkey
        };
    }

    return null;
}

export function listAtprotoApplicationStateRecords(agent: any, collection: string) {
    return agent.com.atproto.repo.listRecords({
        repo: agent?.assertDid as string,
        collection,
    })
        .then((response: any) => response.data)
        .then((data: any) => data.records)
        .catch(() => [])
}

export function getAtprotoApplicationState(agent: any, collection: string, applicationStateKey: string) {
    return agent.com.atproto.repo.getRecord({
        repo: agent?.assertDid as string,
        collection,
        rkey: applicationStateKey.replaceAll('/', ':')
    })
}

export function putAtprotoApplicationState(agent: any, collection: string, rkey: string, record: any) {
    return agent.com.atproto.repo.putRecord({
        repo: agent?.assertDid as string,
        collection,
        rkey,
        record
    })
}