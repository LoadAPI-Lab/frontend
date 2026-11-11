import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { mockApiSpecs, shopSpec, toSummary } from '@/mocks/api-specs';
import { renderWithProviders } from '@/test/render';

import { apiSpecKeys, type ApiSpecSummary } from './api';
import { DeleteSpecDialog } from './delete-spec-dialog';

function setup() {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onDeleted = vi.fn<(spec: ApiSpecSummary) => void>();
    const view = renderWithProviders(
        <DeleteSpecDialog
            spec={toSummary(shopSpec)}
            open
            onOpenChange={onOpenChange}
            onDeleted={onDeleted}
        />,
    );
    return { ...view, onOpenChange, onDeleted };
}

describe('DeleteSpecDialog', () => {
    it('asks before deleting and says what stays', async () => {
        setup();
        expect(await screen.findByRole('alertdialog', { name: 'Delete Shop API?' })).toBeVisible();
        expect(
            screen.getByText('Its 5 endpoints leave the sidebar. Past runs stay in History.'),
        ).toBeVisible();
    });

    it('deletes the spec and drops it from the cache', async () => {
        const { onDeleted, onOpenChange, queryClient } = setup();
        queryClient.setQueryData(apiSpecKeys.detail(shopSpec.id), shopSpec);
        await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
        await waitFor(() =>
            expect(onDeleted).toHaveBeenCalledWith(expect.objectContaining({ id: shopSpec.id })),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(mockApiSpecs.some((spec) => spec.id === shopSpec.id)).toBe(false);
        expect(queryClient.getQueryData(apiSpecKeys.detail(shopSpec.id))).toBeUndefined();
    });

    it('keeps the spec when cancelled', async () => {
        const { onDeleted, onOpenChange } = setup();
        await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onDeleted).not.toHaveBeenCalled();
        expect(mockApiSpecs.some((spec) => spec.id === shopSpec.id)).toBe(true);
    });
});
