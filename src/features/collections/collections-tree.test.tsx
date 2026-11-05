import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { shopSpec } from '@/mocks/api-specs';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { CollectionsTree, type EndpointSelection } from './collections-tree';

afterEach(() => window.localStorage.clear());

function setup() {
    const onSelect = vi.fn<(selection: EndpointSelection) => void>();
    const onImport = vi.fn<() => void>();
    renderWithProviders(
        <CollectionsTree
            selected={null}
            onSelect={onSelect}
            onImport={onImport}
        />,
    );
    return { onSelect, onImport };
}

describe('CollectionsTree', () => {
    it('lists the specs with their endpoint counts', async () => {
        setup();
        expect(
            await screen.findByRole('treeitem', { name: 'Shop API, 5 endpoints' }),
        ).toBeVisible();
        expect(
            screen.getByRole('treeitem', { name: 'LoadAPI test server, 11 endpoints' }),
        ).toBeVisible();
    });

    it('loads endpoints when a spec opens and selects one', async () => {
        const { onSelect } = setup();
        await userEvent.click(await screen.findByText('Shop API'));
        await userEvent.click(await screen.findByText('products'));
        expect(screen.getByRole('treeitem', { name: 'GET /health' })).toBeVisible();
        await userEvent.click(screen.getByRole('treeitem', { name: 'GET /products/{productId}' }));
        expect(onSelect).toHaveBeenCalledWith({
            specId: shopSpec.id,
            endpointKey: 'GET /products/{productId}',
        });
    });

    it('remembers opened folders in this browser', async () => {
        setup();
        await userEvent.click(await screen.findByText('Shop API'));
        expect(
            JSON.parse(window.localStorage.getItem('routelab.collections.expanded') ?? '[]'),
        ).toEqual([`spec:${shopSpec.id}`]);
    });

    it('offers Import when there are no specs', async () => {
        server.use(http.get('*/v1/api-specs', () => HttpResponse.json([])));
        const { onImport } = setup();
        await userEvent.click(await screen.findByRole('button', { name: 'Import OpenAPI doc' }));
        expect(onImport).toHaveBeenCalledOnce();
    });
});
