import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { rememberRun } from '@/lib/run-memory';
import { shopSpec } from '@/mocks/api-specs';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import type { ApiSpecSummary } from './api';
import { CollectionsSearch } from './collections-search';
import {
    CollectionsTree,
    type CollectionsTreeProps,
    type EndpointSelection,
} from './collections-tree';
import type { SpecAction } from './spec-actions';
import { useExpanded } from './use-expanded';

afterEach(() => window.localStorage.clear());

function Harness(props: Pick<CollectionsTreeProps, 'onSelect' | 'onImport' | 'onSpecAction'>) {
    const [expanded, setExpanded] = useExpanded();
    const [query, setQuery] = useState('');
    return (
        <>
            <CollectionsSearch
                value={query}
                onChange={setQuery}
            />
            <CollectionsTree
                selected={null}
                expanded={expanded}
                onExpandedChange={setExpanded}
                query={query}
                {...props}
            />
        </>
    );
}

function setup() {
    const onSelect = vi.fn<(selection: EndpointSelection) => void>();
    const onImport = vi.fn<() => void>();
    const onSpecAction = vi.fn<(action: SpecAction, spec: ApiSpecSummary) => void>();
    renderWithProviders(
        <Harness
            onSelect={onSelect}
            onImport={onImport}
            onSpecAction={onSpecAction}
        />,
    );
    return { onSelect, onImport, onSpecAction };
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
            JSON.parse(window.localStorage.getItem('loadapi.collections.expanded') ?? '[]'),
        ).toEqual([`spec:${shopSpec.id}`]);
    });

    it('offers Import when there are no specs', async () => {
        server.use(http.get('*/v1/api-specs', () => HttpResponse.json([])));
        const { onImport } = setup();
        await userEvent.click(await screen.findByRole('button', { name: 'Import OpenAPI doc' }));
        expect(onImport).toHaveBeenCalledOnce();
    });

    it('shows a spinner on the endpoint whose test is running', async () => {
        const runId = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';
        rememberRun(runId, { spec: shopSpec.id, endpoint: 'GET /health' });
        server.use(
            http.get('*/v1/test-runs', () =>
                HttpResponse.json({
                    items: [
                        {
                            id: runId,
                            type: 'single',
                            status: 'RUNNING',
                            createdAt: '2026-11-08T19:00:00.000Z',
                        },
                    ],
                }),
            ),
        );
        setup();
        await userEvent.click(await screen.findByText('Shop API'));

        expect(
            await screen.findByRole('treeitem', { name: 'GET /health, test running' }),
        ).toBeVisible();
        expect(screen.getAllByTestId('endpoint-running')).toHaveLength(1);
    });

    it('opens the actions of a spec from the keyboard and reports the chosen one', async () => {
        const { onSpecAction } = setup();
        const spec = await screen.findByRole('treeitem', { name: 'Shop API, 5 endpoints' });
        spec.focus();
        await userEvent.keyboard('{Shift>}{F10}{/Shift}');
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
        await waitFor(() =>
            expect(onSpecAction).toHaveBeenCalledWith(
                'delete',
                expect.objectContaining({ id: shopSpec.id }),
            ),
        );
        expect(spec).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens re-import from the actions button of a row', async () => {
        const { onSpecAction } = setup();
        await screen.findByText('Shop API');
        await userEvent.click(screen.getByLabelText('Actions for Shop API'));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'Re-import…' }));
        await waitFor(() =>
            expect(onSpecAction).toHaveBeenCalledWith(
                'reimport',
                expect.objectContaining({ id: shopSpec.id }),
            ),
        );
        expect(screen.getByRole('treeitem', { name: 'Shop API, 5 endpoints' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('blocks deleting a spec while a test runs on it', async () => {
        const runId = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';
        rememberRun(runId, { spec: shopSpec.id, endpoint: 'GET /health' });
        server.use(
            http.get('*/v1/test-runs', () =>
                HttpResponse.json({
                    items: [
                        {
                            id: runId,
                            type: 'single',
                            status: 'RUNNING',
                            createdAt: '2026-11-08T19:00:00.000Z',
                        },
                    ],
                }),
            ),
        );
        setup();
        await userEvent.click(await screen.findByText('Shop API'));
        await screen.findByRole('treeitem', { name: 'GET /health, test running' });
        await userEvent.click(screen.getByLabelText('Actions for Shop API'));
        expect(
            await screen.findByRole('menuitem', { name: "Can't delete while a test runs" }),
        ).toHaveAttribute('aria-disabled', 'true');
    });
});

const search = () => screen.getByRole('searchbox', { name: 'Search endpoints' });

describe('CollectionsTree search', () => {
    it('finds endpoints by path, method and summary across closed docs', async () => {
        setup();
        await screen.findByText('Shop API');
        await userEvent.type(search(), 'product');

        expect(
            await screen.findByRole('treeitem', { name: 'Shop API, 3 matches' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('treeitem', { name: /^products/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getByRole('treeitem', { name: 'GET /products' })).toBeVisible();
        expect(screen.getAllByRole('treeitem', { name: 'GET /products/{productId}' })).toHaveLength(
            1,
        );
        expect(
            screen.queryByRole('treeitem', { name: /^LoadAPI test server/ }),
        ).not.toBeInTheDocument();
        expect(screen.getAllByText('product', { selector: 'mark' }).length).toBeGreaterThan(0);

        await userEvent.clear(search());
        await userEvent.type(search(), 'delete task');
        expect(await screen.findByRole('treeitem', { name: 'DELETE /tasks/{id}' })).toBeVisible();
        expect(screen.getAllByRole('treeitem')).toHaveLength(3);
    });

    it('says when nothing matches', async () => {
        setup();
        await screen.findByText('Shop API');
        await userEvent.type(search(), 'nothing-like-this');

        expect(await screen.findByText('No endpoints match')).toBeVisible();
        expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });

    it('keeps arrow-key navigation over the filtered tree', async () => {
        setup();
        await screen.findByText('Shop API');
        await userEvent.type(search(), 'orders');
        const spec = await screen.findByRole('treeitem', { name: 'Shop API, 1 match' });
        await screen.findByRole('treeitem', { name: 'POST /orders' });

        spec.focus();
        await userEvent.keyboard('{ArrowDown}');
        expect(screen.getByRole('treeitem', { name: /^orders/ })).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(screen.getByRole('treeitem', { name: 'POST /orders' })).toHaveFocus();
    });

    it('restores the earlier open folders when the search is cleared', async () => {
        setup();
        await userEvent.click(await screen.findByText('LoadAPI test server'));
        await screen.findByRole('treeitem', { name: /^load/ });
        await userEvent.type(search(), 'product');
        const shop = await screen.findByRole('treeitem', { name: 'Shop API, 3 matches' });
        await userEvent.click(shop);
        expect(shop).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(search());
        await userEvent.keyboard('{Escape}');
        expect(search()).toHaveValue('');
        expect(
            await screen.findByRole('treeitem', { name: 'LoadAPI test server, 11 endpoints' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('treeitem', { name: 'Shop API, 5 endpoints' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(
            JSON.parse(window.localStorage.getItem('loadapi.collections.expanded') ?? '[]'),
        ).toEqual([expect.stringMatching(/^spec:/)]);
    });
});
