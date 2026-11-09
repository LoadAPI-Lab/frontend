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
