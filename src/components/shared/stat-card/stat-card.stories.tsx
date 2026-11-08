import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { StatCard, StatList } from './stat-card';

const inList: Decorator = (Story) => (
    <StatList className="w-60">
        <Story />
    </StatList>
);

const meta = {
    title: 'shared/StatCard',
    component: StatCard,
    args: { label: 'RPS · target 300', value: '297.4' },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    decorators: [inList],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('term')).toHaveTextContent('RPS · target 300');
        await expect(canvas.getByRole('definition')).toHaveTextContent('297.4');
    },
};

export const WithUnit: Story = {
    decorators: [inList],
    args: { label: 'p95', value: '118', unit: 'ms' },
};

export const Danger: Story = {
    decorators: [inList],
    args: { label: 'errors · 25 of 12,480', value: '0.2', unit: '%', tone: 'danger' },
};

export const Empty: Story = {
    decorators: [inList],
    args: { label: 'p50 · median', value: '—' },
};

export const Row: Story = {
    render: () => (
        <StatList className="w-[980px] grid-cols-4">
            <StatCard
                label="RPS · target 300"
                value="297.4"
            />
            <StatCard
                label="p50 · median"
                value="41"
                unit="ms"
            />
            <StatCard
                label="p95"
                value="118"
                unit="ms"
            />
            <StatCard
                label="errors · 25 of 12,480"
                value="0.2"
                unit="%"
                tone="danger"
            />
        </StatList>
    ),
};
