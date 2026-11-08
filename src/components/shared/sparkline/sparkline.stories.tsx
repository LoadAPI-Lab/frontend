import type { Meta, StoryObj } from '@storybook/react-vite';

import { Sparkline } from './sparkline';

const meta = {
    title: 'shared/Sparkline',
    component: Sparkline,
    args: {
        values: [40, 42, 41, 45, 52, 48, 47, 60, 58, 55, 54, 57],
        className: 'text-accent',
    },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithGaps: Story = { args: { values: [10, 12, null, 14, 13, null, 15] } };
export const Empty: Story = { args: { values: [] } };
