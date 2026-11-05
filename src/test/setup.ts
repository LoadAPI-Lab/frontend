import '@testing-library/jest-dom/vitest';
import '@/app/i18n';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetMockApiSpecs } from '@/mocks/api-specs';
import { server } from '@/mocks/server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
    resetMockApiSpecs();
});
afterAll(() => server.close());
