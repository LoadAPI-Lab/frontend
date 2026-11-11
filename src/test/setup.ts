import '@testing-library/jest-dom/vitest';
import '@/app/i18n';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { resetLiveRuns, setLiveStreamOptions } from '@/api/live';
import { resetMockApiSpecs } from '@/mocks/api-specs';
import { server } from '@/mocks/server';
import { resetMockTestRuns } from '@/mocks/test-runs';

import { FakeEventSource } from './fake-event-source';
import { FakeUPlot } from './fake-uplot';

const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
Object.assign(Range.prototype, {
    getBoundingClientRect: () => ({ ...emptyRect, toJSON: () => emptyRect }),
    getClientRects: () => [],
});

vi.mock('uplot', async () => ({ default: (await import('./fake-uplot')).FakeUPlot }));

setLiveStreamOptions({ createEventSource: (url) => new FakeEventSource(url), batchMs: 0 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
    resetMockApiSpecs();
    resetLiveRuns();
    resetMockTestRuns();
    FakeEventSource.reset();
    FakeUPlot.reset();
    localStorage.clear();
    sessionStorage.clear();
});
afterAll(() => server.close());
