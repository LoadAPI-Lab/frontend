import type { ApiSpecResponseDtoEndpointsItem } from '@/api/generated/model';

import { emptyDraft, newRow, type RequestDraft } from './request-draft';

type Endpoint = ApiSpecResponseDtoEndpointsItem;
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
