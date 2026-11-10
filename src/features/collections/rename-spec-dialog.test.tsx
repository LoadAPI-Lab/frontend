import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { mockApiSpecs, shopSpec, toSummary } from '@/mocks/api-specs';
import { renderWithProviders } from '@/test/render';

import { apiSpecKeys, type ApiSpecSummary, apiSpecsQuery } from './api';
import { RenameSpecDialog } from './rename-spec-dialog';

function setup() {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onRenamed = vi.fn<(spec: ApiSpecSummary) => void>();
    const view = renderWithProviders(
        <RenameSpecDialog
            spec={toSummary(shopSpec)}
            open
            onOpenChange={onOpenChange}
            onRenamed={onRenamed}
        />,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    const submit = screen.getByRole('button', { name: 'Rename' });
    return { ...view, onOpenChange, onRenamed, input, submit };
}

describe('RenameSpecDialog', () => {
    it('starts from the current name and only saves a real change', async () => {
        const { input, submit } = setup();
        expect(screen.getByRole('dialog', { name: 'Rename Shop API' })).toBeVisible();
        expect(input).toHaveValue('Shop API');
        expect(submit).toBeDisabled();
        await userEvent.clear(input);
        await userEvent.type(input, '   ');
        expect(submit).toBeDisabled();
    });

    it('renames the spec everywhere it is cached', async () => {
        const { input, submit, onRenamed, onOpenChange, queryClient } = setup();
        queryClient.setQueryData(apiSpecsQuery.queryKey, [toSummary(shopSpec)]);
        queryClient.setQueryData(apiSpecKeys.detail(shopSpec.id), shopSpec);
        await userEvent.clear(input);
        await userEvent.type(input, '  Shop API v2 ');
        await userEvent.click(submit);
        await waitFor(() =>
            expect(onRenamed).toHaveBeenCalledWith(
                expect.objectContaining({ id: shopSpec.id, name: 'Shop API v2' }),
            ),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(mockApiSpecs.find((spec) => spec.id === shopSpec.id)?.name).toBe('Shop API v2');
        expect(queryClient.getQueryData(apiSpecKeys.detail(shopSpec.id))).toMatchObject({
            name: 'Shop API v2',
        });
    });

    it('stops names over 255 characters', async () => {
        const { input, submit } = setup();
        await userEvent.clear(input);
        await userEvent.click(input);
        await userEvent.paste('x'.repeat(256));
        expect(screen.getByText('Keep the name under 255 characters.')).toBeVisible();
        expect(submit).toBeDisabled();
    });
});
