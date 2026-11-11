import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { HistoryStatus } from './history-api';
import { HistoryToolbar } from './history-toolbar';

function StatefulToolbar({
    onQueryChange,
    onStatusChange,
    onGroupedChange,
}: {
    onQueryChange: (query: string) => void;
    onStatusChange: (status: HistoryStatus | null) => void;
    onGroupedChange: (grouped: boolean) => void;
}) {
    const [query, setQuery] = useState<string>();
    const [status, setStatus] = useState<HistoryStatus>();
    const [grouped, setGrouped] = useState(true);
    return (
        <HistoryToolbar
            query={query}
            status={status}
            grouped={grouped}
            onQueryChange={(next) => {
                setQuery(next || undefined);
                onQueryChange(next);
            }}
            onStatusChange={(next) => {
                setStatus(next ?? undefined);
                onStatusChange(next);
            }}
            onGroupedChange={(next) => {
                setGrouped(next);
                onGroupedChange(next);
            }}
            className="w-88"
        />
    );
}

const meta = {
    title: 'history/HistoryToolbar',
    component: StatefulToolbar,
    args: {
        onQueryChange: fn<(query: string) => void>(),
        onStatusChange: fn<(status: HistoryStatus | null) => void>(),
        onGroupedChange: fn<(grouped: boolean) => void>(),
    },
} satisfies Meta<typeof StatefulToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Interactions: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const search = canvas.getByRole('searchbox', { name: 'Search runs' });
        await userEvent.type(search, '/fixed');
        await expect(args.onQueryChange).toHaveBeenLastCalledWith('/fixed');

        await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }));
        await expect(search).toHaveValue('');

        await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('option', { name: 'Failed' }));
        await expect(args.onStatusChange).toHaveBeenLastCalledWith('failed');

        const group = canvas.getByRole('button', { name: 'Group by endpoint' });
        await userEvent.click(group);
        await expect(group).toHaveAttribute('aria-pressed', 'false');
        await expect(args.onGroupedChange).toHaveBeenLastCalledWith(false);
    },
};
