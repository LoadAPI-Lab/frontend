import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FailureCause } from '@/api/live';

import { FailingWarning } from './failing-warning';

const notFound: FailureCause = { kind: 'status', code: '404', all: true };

function warning() {
    return screen.queryByRole('region', { name: 'Requests failing' });
}

describe('FailingWarning', () => {
    it('renders nothing visible without a cause', () => {
        render(
            <FailingWarning
                cause={null}
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(warning()).toBeNull();
    });

    it('names the status code with its reason phrase', () => {
        render(
            <FailingWarning
                cause={notFound}
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(warning()).toHaveTextContent('All requests return 404 Not Found.');
    });

    it('shows an unknown code on its own', () => {
        render(
            <FailingWarning
                cause={{ kind: 'status', code: '599', all: false }}
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(warning()).toHaveTextContent('Almost all requests return 599.');
    });

    it('names the network error', () => {
        render(
            <FailingWarning
                cause={{ kind: 'network', error: 'dns', all: true }}
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(warning()).toHaveTextContent('All requests fail with a network error: DNS.');
    });

    it('stops the test', async () => {
        const onStop = vi.fn<() => void>();
        render(
            <FailingWarning
                cause={notFound}
                onStop={onStop}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Stop test' }));
        expect(onStop).toHaveBeenCalledOnce();
    });

    it('disables Stop while stopping', () => {
        render(
            <FailingWarning
                cause={notFound}
                stopping
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(screen.getByRole('button', { name: 'Stopping…' })).toBeDisabled();
    });

    it('stays hidden after Dismiss, even when the cause changes', async () => {
        const { rerender } = render(
            <FailingWarning
                cause={notFound}
                onStop={vi.fn<() => void>()}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(warning()).toBeNull();
        rerender(
            <FailingWarning
                cause={null}
                onStop={vi.fn<() => void>()}
            />,
        );
        rerender(
            <FailingWarning
                cause={{ kind: 'status', code: '500', all: true }}
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(warning()).toBeNull();
    });

    it('announces the first warning once and not again when it comes back', () => {
        const { container, rerender } = render(
            <FailingWarning
                cause={null}
                onStop={vi.fn<() => void>()}
            />,
        );
        const region = container.querySelector('[aria-live="polite"]');
        expect(region).toHaveTextContent('');
        rerender(
            <FailingWarning
                cause={notFound}
                onStop={vi.fn<() => void>()}
            />,
        );
        const first = region?.textContent;
        expect(first).toContain('All requests return 404 Not Found.');
        rerender(
            <FailingWarning
                cause={null}
                onStop={vi.fn<() => void>()}
            />,
        );
        rerender(
            <FailingWarning
                cause={{ kind: 'status', code: '500', all: true }}
                onStop={vi.fn<() => void>()}
            />,
        );
        expect(region?.textContent).toBe(first);
        expect(warning()).toHaveTextContent('500 Internal Server Error');
    });
});
