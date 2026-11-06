import '@testing-library/jest-dom/vitest';
import '@/app/i18n';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetLiveRuns, setLiveStreamOptions } from '@/api/live';
import { resetMockApiSpecs } from '@/mocks/api-specs';
import { server } from '@/mocks/server';
import { resetMockTestRuns } from '@/mocks/test-runs';

import { FakeEventSource } from './fake-event-source';

setLiveStreamOptions({ createEventSource: (url) => new FakeEventSource(url) });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
    resetMockApiSpecs();
    resetLiveRuns();
    resetMockTestRuns();
    FakeEventSource.reset();
});
afterAll(() => server.close());
