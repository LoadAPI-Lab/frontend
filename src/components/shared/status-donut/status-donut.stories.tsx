import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { StatusDonut } from './status-donut';

const meta = {
    title: 'shared/StatusDonut',
    component: StatusDonut,
    args: {
        slices: [
            { key: '2xx', value: 978, strokeClassName: 'stroke-accent' },
            { key: '4xx', value: 20, strokeClassName: 'stroke-info' },
            { key: '5xx', value: 2, strokeClassName: 'stroke-danger' },
        ],
    },
} satisfies Meta<typeof StatusDonut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixed: Story = {
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('[data-slice]')).toHaveLength(3);
    },
};

export const AllSuccess: Story = {
    args: { slices: [{ key: '2xx', value: 500, strokeClassName: 'stroke-accent' }] },
};

export const Empty: Story = {
    args: { slices: [] },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll('[data-slice]')).toHaveLength(0);
    },
};

export const Large: Story = { args: { size: 120, thickness: 14 } };
