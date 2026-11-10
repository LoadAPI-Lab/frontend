import type { TestRunResponseDto } from '@/api/generated/model';
import { emptyDraft, newRow, type RequestDraft, type RequestRoute } from '@/lib/request-draft';

import type { TestConfig } from './test-config';
import type { RunTarget } from './use-test-run-controls';

export const MASKED_VALUE = '***';

export interface PastRequest {
    method: RequestRoute['method'];
    server: string;
    path: string;
    draft: RequestDraft;
    config: TestConfig;
}

const ORIGIN = /^([a-z][a-z\d+.-]*:\/\/[^/?#]+)([^?#]*)/i;
const BEARER = /^bearer\s+(\S[\s\S]*)$/i;

export function splitTargetUrl(url: string): { server: string; path: string } {
    const match = ORIGIN.exec(url);
    if (!match) {
        return { server: '', path: url.split(/[?#]/, 1)[0] ?? url };
    }
    const [, server = '', path = ''] = match;
    return { server, path: path || '/' };
}

const queryOf = (url: string) => new URLSearchParams(url.split('#', 1)[0]?.split('?')[1] ?? '');

const isMasked = (value: string) => value === MASKED_VALUE || value.endsWith(` ${MASKED_VALUE}`);

export function maskedSecret(target: RunTarget): string | null {
    const header = Object.entries(target.headers ?? {}).find(([, value]) => isMasked(value));
    if (header) {
        return header[0];
    }
    const param = [...queryOf(target.url)].find(([, value]) => value === MASKED_VALUE);
    return param ? param[0] : null;
}

export function pastRequest(run: TestRunResponseDto): PastRequest | null {
    const { config } = run;
    if (!('target' in config)) {
        return null;
    }
    const { method, url, headers = {}, body } = config.target;
    const draft = emptyDraft();
    draft.body = body ?? '';
    draft.query = [...queryOf(url)].map(([key, value]) => newRow(key, value));
    for (const [name, value] of Object.entries(headers)) {
        const bearer = name.toLowerCase() === 'authorization' ? BEARER.exec(value) : null;
        if (bearer?.[1]) {
            draft.auth = { kind: 'bearer', token: bearer[1] };
        } else {
            draft.headers.push(newRow(name, value));
        }
    }
    return {
        method,
        ...splitTargetUrl(url),
        draft,
        config: {
            targetRps: config.targetRps,
            durationSeconds: config.durationSeconds,
            rampUpSeconds: config.rampUpSeconds ?? 0,
        },
    };
}
