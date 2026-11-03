import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ErrorState } from './error-state';

const meta = {
    title: 'shared/ErrorState',
    component: ErrorState,
    args: {
        message: 'Test run not found',
        requestId: 'req_tz4a98xxat96iws9zmbrgj3a',
        onRetry: fn(),
    },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Request ID: req_tz4a98xxat96iws9zmbrgj3a',
        );
        await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
        await expect(args.onRetry).toHaveBeenCalledOnce();
    },
};

export const Compact: Story = { args: { size: 'compact', requestId: null } };
export const WithoutRetry: Story = { args: { onRetry: undefined } };
