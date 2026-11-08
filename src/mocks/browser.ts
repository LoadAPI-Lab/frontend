import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';
import { liveStreamHandlers } from './test-runs';

export const worker = setupWorker(...liveStreamHandlers(), ...handlers);
