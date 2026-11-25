import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FailingWarning } from './failing-warning';

const meta = {
    title: 'live-metrics/FailingWarning',
    component: FailingWarning,
    args: {
        cause: { kind: 'status', code: '404', all: true },
        stopping: false,
        onStop: fn(),
    },
    decorators: [
        (Story) => (
            <div className="w-[980px]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof FailingWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatusCode: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('region', { name: 'Requests failing' })).toHaveTextContent(
            'All requests return 404 Not Found.',
        );
        await userEvent.click(canvas.getByRole('button', { name: 'Stop test' }));
        await expect(args.onStop).toHaveBeenCalledOnce();
    },
};

export const MostRequests: Story = {
    args: { cause: { kind: 'status', code: '503', all: false } },
};

export const NetworkError: Story = {
    args: { cause: { kind: 'network', error: 'connection_refused', all: true } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('region', { name: 'Requests failing' })).toHaveTextContent(
            'All requests fail with a network error: Connection refused.',
        );
    },
};

export const Stopping: Story = {
    args: { stopping: true },
};

export const Dismissed: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
        await expect(canvas.queryByRole('region', { name: 'Requests failing' })).toBeNull();
    },
};
