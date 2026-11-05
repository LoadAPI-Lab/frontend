import '@testing-library/jest-dom/vitest';
import '@/app/i18n';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from '@/mocks/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
});
afterAll(() => server.close());
