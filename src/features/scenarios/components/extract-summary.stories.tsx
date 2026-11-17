import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { newRow } from '@/lib/request-draft';

import { ExtractSummary } from './extract-summary';

const shownChips = (root: HTMLElement) =>
    [...root.querySelectorAll('button .bg-accent')].filter(
        (chip) => !chip.closest('[aria-hidden="true"]'),
    );

const meta = {
    title: 'scenarios/ExtractSummary',
    component: ExtractSummary,
    args: {
        number: 2,
        rules: [
            newRow('taskId', 'data.id'),
            newRow('title', 'data.title'),
            newRow('status', 'data.status'),
            newRow('email', 'data.owner.email'),
            newRow('ownerId', 'data.owner.id'),
            newRow('firstTag', 'data.tags.0'),
        ],
    },
    decorators: [
        (Story) => (
            <div className="bg-surface-input w-140 p-3">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ExtractSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const toggle = canvas.getByRole('button', { name: /Extract/ });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(shownChips(canvasElement)).toHaveLength(6);
        await expect(canvas.queryByText(/^\+[1-5]$/)).toBeNull();
        await expect(canvas.queryByRole('list')).toBeNull();

        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const list = canvas.getByRole('list', { name: 'Step 2 extracts' });
        await expect(within(list).getAllByRole('listitem')).toHaveLength(6);
        await expect(within(list).getByText('data.owner.email')).toBeVisible();
    },
};

export const Narrow: Story = {
    decorators: [
        (Story) => (
            <div className="w-80">
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const more = await canvas.findByText(/^\+[1-5]$/);
        const shown = shownChips(canvasElement);
        await expect(Number(more.textContent?.slice(1)) + shown.length).toBe(6);
        await expect(shown.length).toBeGreaterThan(0);
        await expect(shown.length).toBeLessThan(6);
    },
};

export const Open: Story = {
    args: { defaultOpen: true, rules: [newRow('token', 'accessToken')] },
};
