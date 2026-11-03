import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './skeleton';

const meta = {
    title: 'ui/Skeleton',
    component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatCards: Story = {
    render: () => (
        <div className="flex w-180 gap-3">
            {[0, 1, 2, 3].map((n) => (
                <div
                    key={n}
                    className="bg-surface-1 border-border rounded-card flex flex-1 flex-col gap-2 border p-4"
                >
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-3 w-28" />
                </div>
            ))}
        </div>
    ),
};

export const TreeRows: Story = {
    render: () => (
        <div className="flex w-60 flex-col gap-2">
            <Skeleton className="rounded-item h-8.5 w-full" />
            <Skeleton className="ml-4 h-6 w-4/5" />
            <Skeleton className="ml-4 h-6 w-3/5" />
            <Skeleton className="ml-4 h-6 w-2/3" />
        </div>
    ),
};
