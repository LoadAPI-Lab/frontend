import { EditorView } from '@codemirror/view';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { mockApiSpecs, shopSpec, toSummary } from '@/mocks/api-specs';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { ImportDialog } from './import-dialog';
import type { SavedSpec } from './import-spec';

const documentBox = () => screen.getByRole('textbox', { name: 'OpenAPI document' });

function editorView() {
    const view = EditorView.findFromDOM(documentBox());
    if (!view) {
        throw new Error('The document editor is not mounted');
    }
    return view;
}

function typeDoc(text: string) {
    const view = editorView();
    act(() => {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    });
}

const importButton = () => screen.getByRole('button', { name: 'Import' });

function setup() {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onImported = vi.fn<(saved: SavedSpec) => void>();
    renderWithProviders(
        <ImportDialog
            open
            onOpenChange={onOpenChange}
            onImported={onImported}
        />,
    );
    return { onOpenChange, onImported };
}

const validDoc = 'openapi: 3.0.3\ninfo:\n  title: Pet Store\n  version: 1.0.0\npaths: {}\n';

const petStoreYaml = [
    'openapi: 3.1.0',
    'info:',
    '  title: Pet Store',
    '  version: 1.0.0',
    'paths:',
    '  /pets:',
    '    get:',
    '      tags: [pets]',
    '    post:',
    '      tags: [pets]',
    '  /users:',
    '    get:',
    '      tags: [users]',
    '',
].join('\n');

describe('ImportDialog', () => {
    it('previews a pasted doc, uses its title as the name, then imports it', async () => {
        const { onImported, onOpenChange } = setup();
        expect(importButton()).toBeDisabled();
        typeDoc(validDoc);
        expect(await screen.findByText('OpenAPI 3.0 · 0 endpoints · 0 tags')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Name (optional)' })).toHaveAttribute(
            'placeholder',
            'Pet Store',
        );
        await userEvent.click(importButton());
        await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
        expect(onImported.mock.calls[0]?.[0]).toMatchObject({
            spec: { name: 'Pet Store' },
            changes: null,
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("previews counts that match the doc's endpoints and sidebar folders", async () => {
        setup();
        typeDoc(petStoreYaml);
        expect(await screen.findByText('OpenAPI 3.1 · 3 endpoints · 2 tags')).toBeVisible();
    });

    it('shows syntax errors inline and keeps Import disabled', async () => {
        const requests = vi.fn<() => void>();
        server.events.on('request:start', requests);
        setup();
        typeDoc('openapi: 3.0.3\ninfo:\n\ttitle: Broken\npaths: {}');
        expect(
            await screen.findByText('Line 3, column 1: Tabs are not allowed as indentation'),
        ).toBeVisible();
        expect(documentBox()).toHaveAttribute('aria-invalid', 'true');
        expect(importButton()).toBeDisabled();
        expect(requests).not.toHaveBeenCalled();
        server.events.removeAllListeners();
    });

    it('explains that Swagger 2.0 is not supported', async () => {
        setup();
        typeDoc('swagger: "2.0"\ninfo:\n  title: Old\npaths: {}');
        expect(await screen.findByText(/Only OpenAPI 3\.0 and 3\.1 are supported/)).toBeVisible();
        expect(importButton()).toBeDisabled();
    });

    it('lists the problems core finds and clears them when the doc changes', async () => {
        server.use(
            http.post('*/v1/api-specs', () =>
                HttpResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'API_SPEC.INVALID',
                            message: 'The file is not a valid OpenAPI document',
                            retryable: false,
                        },
                        details: [
                            { field: 'info.version', message: 'is required', code: 'invalid_spec' },
                        ],
                    },
                    { status: 400 },
                ),
            ),
        );
        setup();
        typeDoc('openapi: 3.0.3\ninfo:\n  title: No version\npaths: {}\n');
        await screen.findByText('OpenAPI 3.0 · 0 endpoints · 0 tags');
        await userEvent.click(importButton());
        expect(await screen.findByText("This isn't a valid OpenAPI document:")).toBeVisible();
        expect(screen.getByText('info.version')).toBeVisible();
        typeDoc('openapi: 3.0.3\ninfo:\n  title: No version\n  version: 1.0.0\npaths: {}\n');
        await waitFor(() =>
            expect(screen.queryByText("This isn't a valid OpenAPI document:")).toBeNull(),
        );
    });

    it('loads a chosen file into the editor', async () => {
        setup();
        fireEvent.change(screen.getByLabelText('OpenAPI file'), {
            target: { files: [new File([petStoreYaml], 'pet-store.yaml')] },
        });
        expect(await screen.findByText('OpenAPI 3.1 · 3 endpoints · 2 tags')).toBeVisible();
        expect(documentBox()).toHaveTextContent('title: Pet Store');
    });

    it('loads a file dropped onto the dialog', async () => {
        setup();
        const file = new File([JSON.stringify({ openapi: '3.0.3', paths: {} })], 'api.json');
        fireEvent.drop(screen.getByRole('dialog'), {
            dataTransfer: { files: [file], types: ['Files'] },
        });
        expect(await screen.findByText('OpenAPI 3.0 · 0 endpoints · 0 tags')).toBeVisible();
    });

    it('rejects files of another type', async () => {
        setup();
        fireEvent.change(screen.getByLabelText('OpenAPI file'), {
            target: { files: [new File(['hello'], 'notes.txt')] },
        });
        expect(
            await screen.findByText("notes.txt isn't a .json, .yaml or .yml file."),
        ).toBeVisible();
        expect(importButton()).toBeDisabled();
    });

    it('rejects files over 5 MB without reading them', async () => {
        setup();
        const file = new File(['openapi: 3.1.0'], 'huge.yaml');
        Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
        fireEvent.change(screen.getByLabelText('OpenAPI file'), { target: { files: [file] } });
        expect(await screen.findByText('huge.yaml is over 5 MB, the import limit.')).toBeVisible();
        expect(editorView().state.doc.toString()).toBe('');
    });

    it('re-imports a new version over a saved doc and reports the changes', async () => {
        const onImported = vi.fn<(saved: SavedSpec) => void>();
        renderWithProviders(
            <ImportDialog
                open
                onOpenChange={vi.fn<(open: boolean) => void>()}
                onImported={onImported}
                replacing={toSummary(shopSpec)}
            />,
        );
        expect(screen.getByRole('dialog', { name: 'Re-import Shop API' })).toBeVisible();
        typeDoc(
            JSON.stringify({
                openapi: '3.0.3',
                info: { title: 'Shop API', version: '2.2.0' },
                paths: {
                    '/products': { get: { summary: 'List all products', tags: ['products'] } },
                    '/carts': { post: { summary: 'Create a cart', tags: ['carts'] } },
                },
            }),
        );
        expect(await screen.findByText('OpenAPI 3.0 · 2 endpoints · 2 tags')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Name (optional)' })).toHaveAttribute(
            'placeholder',
            'Keeps Shop API',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Re-import' }));
        await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
        expect(onImported.mock.calls[0]?.[0]).toMatchObject({
            spec: { id: shopSpec.id, name: 'Shop API' },
            changes: {
                added: ['POST /carts'],
                changed: ['GET /products'],
                removed: [
                    'GET /products/{productId}',
                    'DELETE /products/{productId}',
                    'POST /orders',
                    'GET /health',
                ],
            },
        });
        expect(mockApiSpecs.find((spec) => spec.id === shopSpec.id)?.endpoints).toHaveLength(2);
    });
});
