import { useState } from 'react';

import { rememberedServer, rememberServer } from '@/lib/server-memory';

export function useServer(specId: string, servers: { url: string }[]) {
    const [chosen, setChosen] = useState(() => rememberedServer(specId));
    const server = chosen ?? servers[0]?.url ?? '';
    const setServer = (url: string) => {
        setChosen(url);
        rememberServer(specId, url);
    };
    return [server, setServer] as const;
}
