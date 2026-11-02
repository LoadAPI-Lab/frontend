import '@/app/styles/globals.css';
import '@/app/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Providers } from '@/app/providers';
import { config } from '@/config';

async function enableMocking() {
    if (!config.apiMocking) {
        return;
    }
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledFrame: 'bypass' });
}

const container = document.querySelector('#root');
if (!container) {
    throw new Error('Missing #root element');
}

void enableMocking().then(() => {
    createRoot(container).render(
        <StrictMode>
            <Providers />
        </StrictMode>,
    );
});
