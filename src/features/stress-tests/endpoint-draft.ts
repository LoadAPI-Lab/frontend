import type { Endpoint } from '@/features/collections';
import { emptyDraft, newRow, type RequestDraft } from '@/lib/request-draft';

type Parameter = Endpoint['parameters'][number];
type BodyField = NonNullable<NonNullable<Endpoint['requestBody']>['fields']>[number];

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

export function draftFromEndpoint(endpoint: Endpoint): RequestDraft {
    const draft = emptyDraft();
    const { requestBody } = endpoint;
    if (requestBody && isJson(requestBody.contentType) && requestBody.example) {
        draft.body = requestBody.example;
    }
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

const INT_TOKEN = '__routelab_random_int__';

function placeholderFor(field: BodyField): unknown {
    const format = field.format?.toLowerCase();
    if (field.type === 'integer' || field.type === 'number') {
        return INT_TOKEN;
    }
    if (field.type === 'boolean') {
        return true;
    }
    if (format === 'uuid') {
        return '{{$uuid}}';
    }
    if (format === 'email') {
        return '{{$randomEmail}}';
    }
    return 'string';
}

type Container = Record<string, unknown> | unknown[];

const isIndex = (segment: string | undefined) => segment !== undefined && /^\d+$/.test(segment);

function read(target: Container, key: string): unknown {
    return Array.isArray(target) ? target[Number(key)] : target[key];
}

function assign(target: Container, key: string, value: unknown) {
    if (Array.isArray(target)) {
        target[Number(key)] = value;
    } else {
        target[key] = value;
    }
}

function childFor(existing: unknown, asArray: boolean): Container {
    if (asArray) {
        return Array.isArray(existing) ? [...existing] : [];
    }
    return existing && typeof existing === 'object' && !Array.isArray(existing)
        ? Object.fromEntries(Object.entries(existing))
        : {};
}

function setPath(target: Container, path: readonly string[], value: unknown) {
    const [head, ...rest] = path;
    if (head === undefined) {
        return;
    }
    if (rest.length === 0) {
        assign(target, head, value);
        return;
    }
    const child = childFor(read(target, head), isIndex(rest[0]));
    setPath(child, rest, value);
    assign(target, head, child);
}

export function placeholderBody(fields: BodyField[]): string {
    const body: Record<string, unknown> = {};
    for (const field of fields) {
        const path = field.path.replaceAll('[]', '').split('.').filter(Boolean);
        setPath(body, path, placeholderFor(field));
    }
    return JSON.stringify(body, null, 2).replaceAll(`"${INT_TOKEN}"`, '{{$randomInt}}');
}

export const hasBodyFields = (endpoint: Endpoint) =>
    (endpoint.requestBody?.fields?.length ?? 0) > 0 &&
    isJson(endpoint.requestBody?.contentType ?? '');
