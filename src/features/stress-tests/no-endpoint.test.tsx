import { renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import {
    setImportDialogOpen,
    useImportDialogOpen,
} from '@/features/collections/import-dialog-store';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { NoEndpoint } from './no-endpoint';

afterEach(() => setImportDialogOpen(false));

describe('NoEndpoint', () => {
    it('asks to pick an endpoint when collections exist', async () => {
        renderWithProviders(<NoEndpoint />);
        expect(await screen.findByText('Pick an endpoint from the sidebar')).toBeVisible();
        expect(
            screen.queryByRole('button', { name: 'Import OpenAPI doc' }),
        ).not.toBeInTheDocument();
    });

    it('offers to import a doc when there are no collections', async () => {
        server.use(http.get('*/v1/api-specs', () => HttpResponse.json([])));
        const dialog = renderHook(() => useImportDialogOpen());
        renderWithProviders(<NoEndpoint />);
        expect(await screen.findByText('Import an OpenAPI doc to start')).toBeVisible();
        expect(dialog.result.current[0]).toBe(false);
        await userEvent.click(screen.getByRole('button', { name: 'Import OpenAPI doc' }));
        expect(dialog.result.current[0]).toBe(true);
    });
});
