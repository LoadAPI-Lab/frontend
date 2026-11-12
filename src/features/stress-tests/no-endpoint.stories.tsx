import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NoEndpointCard } from './no-endpoint';

const meta = {
    title: 'stress-tests/NoEndpointCard',
    component: NoEndpointCard,
    args: { hasCollections: true, onImport: fn(), onNewRequest: fn() },
} satisfies Meta<typeof NoEndpointCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PickEndpoint: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Pick an endpoint from the sidebar')).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'New request' }));
        await expect(args.onNewRequest).toHaveBeenCalledOnce();
        await expect(canvas.getAllByRole('button')).toHaveLength(1);
    },
};

export const PickEndpointWithoutNewRequest: Story = {
    args: { onNewRequest: undefined },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).queryByRole('button')).not.toBeInTheDocument();
    },
};

export const NoCollections: Story = {
    args: { hasCollections: false },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Import an OpenAPI doc to start')).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'Import OpenAPI doc' }));
        await expect(args.onImport).toHaveBeenCalledOnce();
        await expect(canvas.getByRole('button', { name: 'New request' })).toBeVisible();
    },
};
