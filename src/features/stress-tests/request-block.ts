import { isValidJsonBody } from '@/lib/json-body';
import { unresolvedPathParam } from '@/lib/target-url';

import { maskedSecret } from './past-run';
import type { RunTarget } from './use-test-run-controls';

export type RequestBlock =
    | { kind: 'noTarget' }
    | { kind: 'noServer' }
    | { kind: 'pathParam'; param: string }
    | { kind: 'maskedSecret'; name: string }
    | { kind: 'invalidBody' };

export function requestBlock(target: RunTarget | null, body: string): RequestBlock | null {
    if (!target) {
        return { kind: 'noTarget' };
    }
    if (!/^https?:\/\/[^/]/i.test(target.url)) {
        return { kind: 'noServer' };
    }
    const param = unresolvedPathParam(target.url);
    if (param) {
        return { kind: 'pathParam', param };
    }
    const secret = maskedSecret(target);
    if (secret) {
        return { kind: 'maskedSecret', name: secret };
    }
    if (!isValidJsonBody(body)) {
        return { kind: 'invalidBody' };
    }
    return null;
}
