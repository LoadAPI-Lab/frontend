import type { Endpoint } from '@/features/collections';
import { editedBodyFor, forgetEditedBody, rememberEditedBody } from '@/lib/body-memory';
import { draftFromEndpoint, exampleBody } from '@/lib/endpoint-request';
import type { RequestDraft } from '@/lib/request-draft';
import type { EndpointPlace } from '@/lib/run-memory';

export function restoredDraft(endpoint: Endpoint, place: EndpointPlace): RequestDraft {
    const draft = draftFromEndpoint(endpoint);
    const edited = editedBodyFor(place);
    return edited === undefined ? draft : { ...draft, body: edited };
}

export function rememberBody(endpoint: Endpoint, place: EndpointPlace, body: string) {
    if (body === (exampleBody(endpoint) ?? '')) {
        forgetEditedBody(place);
    } else {
        rememberEditedBody(place, body);
    }
}
