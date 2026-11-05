import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import type { ApiSpec } from './api';
import { ImportDialog } from './import-dialog';

const submitImport = () => userEvent.click(screen.getByRole('button', { name: 'Import' }));

function setup() {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onImported = vi.fn<(spec: ApiSpec) => void>();
    renderWithProviders(
        <ImportDialog
            open
            onOpenChange={onOpenChange}
            onImported={onImported}
        />,
    );
    const content = screen.getByRole('textbox', { name: 'OpenAPI document' });
    const paste = (text: string) => fireEvent.change(content, { target: { value: text } });
    return { onOpenChange, onImported, content, paste, submit: submitImport };
}

const validDoc = 'openapi: 3.0.3\ninfo:\n  title: Pet Store\n  version: 1.0.0\npaths: {}\n';

describe('ImportDialog', () => {
    it('imports a pasted doc, then closes and reports it', async () => {
        const { paste, submit, onImported, onOpenChange } = setup();
        paste(validDoc);
        await submit();
        await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
        expect(onImported.mock.calls[0]?.[0]).toMatchObject({ name: 'Pet Store' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows where the syntax breaks and keeps the text', async () => {
        const { paste, submit, content } = setup();
        const broken = 'openapi: 3.0.3\ninfo:\n\ttitle: Broken\npaths: {}';
        paste(broken);
        await submit();
        expect(
            await screen.findByText('Line 3, column 1: tabs are not allowed for indentation'),
        ).toBeVisible();
        expect(content).toHaveValue(broken);
        expect(content).toHaveFocus();
    });

    it('lists the problems of an invalid OpenAPI doc', async () => {
        const { paste, submit } = setup();
        paste('openapi: 3.0.3\ninfo:\n  title: Broken doc\n');
        await submit();
        expect(await screen.findByText("This isn't a valid OpenAPI document:")).toBeVisible();
        expect(screen.getByText('paths')).toBeVisible();
    });

    it('explains that Swagger 2.0 is not supported', async () => {
        const { paste, submit } = setup();
        paste('swagger: "2.0"\ninfo:\n  title: Old\npaths: {}');
        await submit();
        expect(await screen.findByText(/Only OpenAPI 3\.0 and 3\.1 are supported/)).toBeVisible();
    });

    it('stops docs over 5 MB before sending them', () => {
        const requests = vi.fn<() => void>();
        server.events.on('request:start', requests);
        const { paste } = setup();
        paste(`openapi: 3.0.3\n${'x'.repeat(5 * 1024 * 1024)}`);
        expect(screen.getByText('This doc is over 5 MB, the import limit.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
        expect(requests).not.toHaveBeenCalled();
        server.events.removeAllListeners();
    });
});
