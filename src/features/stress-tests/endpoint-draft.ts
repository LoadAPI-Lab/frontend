import type { Endpoint } from '@/features/collections';
import { editedBodyFor, forgetEditedBody, rememberEditedBody } from '@/lib/body-memory';
import { emptyDraft, newRow, type RequestDraft } from '@/lib/request-draft';
import type { RunPlace } from '@/lib/run-memory';

type Parameter = Endpoint['parameters'][number];

function exampleValue(parameter: Parameter): string | undefined {
    const value = parameter.schema?.example ?? parameter.schema?.default;
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return `${value}`;
    }
    if (value && typeof value === 'object') {
        return JSON.stringify(value);
    }
    return undefined;
}

const isJson = (contentType: string) => /\bjson\b/i.test(contentType);

const isBearerHeader = (parameter: Parameter) =>
    parameter.name.toLowerCase() === 'authorization' &&
    /bearer/i.test(parameter.description ?? 'bearer');

export function exampleBody({ requestBody }: Endpoint): string | undefined {
    return requestBody && isJson(requestBody.contentType) && requestBody.example
        ? requestBody.example
        : undefined;
}

export function draftFromEndpoint(endpoint: Endpoint): RequestDraft {
    const draft = emptyDraft();
    draft.body = exampleBody(endpoint) ?? '';
    for (const parameter of endpoint.parameters) {
        const example = exampleValue(parameter);
        if (parameter.in === 'path') {
            draft.pathParams[parameter.name] = example ?? '';
        } else if (parameter.in === 'query' && (parameter.required || example !== undefined)) {
            draft.query.push(newRow(parameter.name, example ?? ''));
        } else if (parameter.in === 'header' && isBearerHeader(parameter)) {
            draft.auth = { kind: 'bearer', token: '' };
        } else if (parameter.in === 'header') {
            draft.headers.push(newRow(parameter.name, example ?? ''));
        }
    }
    return draft;
}

export function restoredDraft(endpoint: Endpoint, place: RunPlace): RequestDraft {
    const draft = draftFromEndpoint(endpoint);
    const edited = editedBodyFor(place);
    return edited === undefined ? draft : { ...draft, body: edited };
}

export function rememberBody(endpoint: Endpoint, place: RunPlace, body: string) {
    if (body === (exampleBody(endpoint) ?? '')) {
        forgetEditedBody(place);
    } else {
        rememberEditedBody(place, body);
    }
}
