import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ScratchRow } from './scratch-row';

const meta = {
    title: 'collections/ScratchRow',
    component: ScratchRow,
    args: {
        method: 'POST',
        url: 'https://api.dev/tasks?notify=true',
        selected: false,
        onOpen: fn(),
        className: 'w-60',
    },
} satisfies Meta<typeof ScratchRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const row = within(canvasElement).getByRole('button', { name: /^POST Scratch request/ });
        await userEvent.click(row);
        await expect(args.onOpen).toHaveBeenCalledOnce();
    },
};

export const Selected: Story = {
    args: { selected: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button')).toHaveAttribute(
            'aria-current',
            'page',
        );
    },
};

export const Running: Story = {
    args: { selected: true, running: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('button')).toHaveAccessibleName(
            /test running$/,
        );
    },
};

export const NoUrlYet: Story = {
    args: { method: 'GET', url: '' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText('No URL yet')).toBeVisible();
    },
};
