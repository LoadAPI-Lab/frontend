import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { shopSpec } from '@/mocks/api-specs';
import { renderWithProviders } from '@/test/render';

import { CollectionsRail } from './collections-rail';

describe('CollectionsRail', () => {
    it('shows each collection by its initials and marks the active one', async () => {
        const onOpen = vi.fn<(specId: string) => void>();
        renderWithProviders(
            <CollectionsRail
                activeSpecId={shopSpec.id}
                onOpen={onOpen}
            />,
        );

        const shop = await screen.findByRole('button', { name: 'Open Shop API' });
        expect(shop).toHaveAttribute('aria-current', 'true');
        expect(
            screen.getByRole('button', { name: 'Open LoadAPI test server' }),
        ).not.toHaveAttribute('aria-current');

        await userEvent.click(shop);
        expect(onOpen).toHaveBeenCalledWith(shopSpec.id);
    });
});
