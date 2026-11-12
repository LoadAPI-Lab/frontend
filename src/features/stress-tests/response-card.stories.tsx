import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import {
    binaryResponse,
    jsonResponse,
    notFoundResponse,
    refusedOutcome,
    truncatedResponse,
} from './fixtures';
import { ResponseCard } from './response-card';

const meta = {
    title: 'stress-tests/ResponseCard',
    component: ResponseCard,
    args: { outcome: null, problem: null, sending: false, className: 'h-120' },
    decorators: [
        (Story) => (
            <div className="w-160">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ResponseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('No response yet')).toBeVisible();
    },
};

export const Json: Story = {
    args: { outcome: jsonResponse },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('200 OK')).toBeVisible();
        await userEvent.click(canvas.getByRole('tab', { name: /^Headers/ }));
        await expect(canvas.getAllByRole('row', { name: /set-cookie/ })).toHaveLength(2);
    },
};

export const NotFound: Story = { args: { outcome: notFoundResponse } };

export const Binary: Story = { args: { outcome: binaryResponse } };

export const Truncated: Story = { args: { outcome: truncatedResponse } };

export const NetworkError: Story = {
    args: { outcome: refusedOutcome },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('No response: Connection refused'),
        ).toBeVisible();
    },
};

export const TargetNotAllowed: Story = {
    args: { problem: { kind: 'targetNotAllowed' } },
};

export const Sending: Story = { args: { sending: true } };
