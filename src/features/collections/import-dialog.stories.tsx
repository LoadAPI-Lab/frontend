import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { shopSpec, toSummary } from '@/mocks/api-specs';

import { ImportDialog, type ImportDialogProps } from './import-dialog';

const queryClient = new QueryClient();

type StoryArgs = Pick<ImportDialogProps, 'replacing'>;

const meta = {
    title: 'collections/ImportDialog',
    render: ({ replacing }) => (
        <QueryClientProvider client={queryClient}>
            <ImportDialog
                open
                onOpenChange={fn()}
                onImported={fn()}
                replacing={replacing}
            />
        </QueryClientProvider>
    ),
    args: {},
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const petStore = [
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
    '  /health:',
    '    get: {}',
].join('\n');

async function pasteDoc(canvasElement: HTMLElement, text: string) {
    const body = within(canvasElement.ownerDocument.body);
    const editor = await body.findByRole('textbox', { name: 'OpenAPI document' });
    await userEvent.click(editor);
    await userEvent.paste(text);
    return body;
}

export const Empty: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(
            await body.findByText('Drop a .json, .yaml or .yml file here, or paste the document.'),
        ).toBeVisible();
        await expect(body.getByRole('button', { name: 'Import' })).toBeDisabled();
    },
};

export const Preview: Story = {
    play: async ({ canvasElement }) => {
        const body = await pasteDoc(canvasElement, petStore);
        await waitFor(() =>
            expect(body.getByText('OpenAPI 3.1 · 3 endpoints · 1 tag')).toBeVisible(),
        );
        await expect(body.getByRole('textbox', { name: 'Name (optional)' })).toHaveAttribute(
            'placeholder',
            'Pet Store',
        );
        await expect(body.getByRole('button', { name: 'Import' })).toBeEnabled();
    },
};

export const InvalidYaml: Story = {
    play: async ({ canvasElement }) => {
        const body = await pasteDoc(canvasElement, 'openapi: 3.1.0\npaths:\n  /a: {get: {}\n');
        await waitFor(() => expect(body.getByText(/^Line 4, column 1: /)).toBeVisible());
        await expect(body.getByRole('button', { name: 'Import' })).toBeDisabled();
    },
};

export const Reimport: Story = {
    args: { replacing: toSummary(shopSpec) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByRole('dialog', { name: 'Re-import Shop API' })).toBeVisible();
        await expect(body.getByRole('textbox', { name: 'Name (optional)' })).toHaveAttribute(
            'placeholder',
            'Keeps Shop API',
        );
    },
};
