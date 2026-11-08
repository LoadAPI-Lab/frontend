import type { EventSourceLike } from '@/api/live/snapshot-stream';

type Listener = (event: MessageEvent<string>) => void;

export class FakeEventSource implements EventSourceLike {
    static instances: FakeEventSource[] = [];

    static latest(): FakeEventSource {
        const source = FakeEventSource.instances.at(-1);
        if (!source) {
            throw new Error('No EventSource was opened');
        }
        return source;
    }

    static reset() {
        FakeEventSource.instances = [];
    }

    closed = false;
    private readonly listeners = new Map<string, Listener[]>();

    constructor(readonly url: string) {
        FakeEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: Listener) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    close() {
        this.closed = true;
    }

    open() {
        this.dispatch(new MessageEvent('open'));
    }

    emit(type: string, data: unknown) {
        this.dispatch(new MessageEvent(type, { data: JSON.stringify(data) }));
    }

    fail() {
        this.dispatch(new MessageEvent('error'));
    }

    private dispatch(event: MessageEvent<string>) {
        for (const listener of this.listeners.get(event.type) ?? []) {
            listener(event);
        }
    }
}
