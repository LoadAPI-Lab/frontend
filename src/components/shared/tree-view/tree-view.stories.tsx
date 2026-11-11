import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { IconButton } from '@/components/ui/icon-button';

import { type TreeNode, TreeView } from './tree-view';

const row = 'flex h-7 items-center rounded-md px-2 text-base text-fg-muted hover:bg-surface-input';

const leaf = (id: string): TreeNode => ({
    id,
    content: id,
    rowClassName: `${row} ml-8 font-mono`,
});

const nodes: TreeNode[] = [
    {
        id: 'shop',
        content: 'Shop API',
        rowClassName: `${row} text-fg font-semibold`,
        children: [
            {
                id: 'products',
                content: 'products',
                rowClassName: `${row} ml-4.5`,
                children: [leaf('GET /products'), leaf('DELETE /products/{productId}')],
            },
        ],
    },
    {
        id: 'billing',
        content: 'Billing',
        rowClassName: `${row} text-fg font-semibold`,
        children: [],
    },
];

function Controlled() {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['shop']));
    const [selected, setSelected] = useState<string | null>(null);
    return (
        <TreeView
            nodes={nodes}
            aria-label="Collections"
            expandedIds={expanded}
            onExpandedChange={(id, open) =>
                setExpanded((current) => {
                    const next = new Set(current);
                    if (open) {
                        next.add(id);
                    } else {
                        next.delete(id);
                    }
                    return next;
                })
            }
            selectedId={selected}
            onSelect={(node) => setSelected(node.id)}
            className="w-60"
        />
    );
}

const meta = {
    title: 'shared/TreeView',
    component: Controlled,
} satisfies Meta<typeof Controlled>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Keyboard: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.tab();
        await userEvent.keyboard('{ArrowDown}{ArrowRight}{ArrowDown}{Enter}');
        await expect(canvas.getByRole('treeitem', { name: 'GET /products' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        await waitFor(() => expect(canvasElement.getAnimations({ subtree: true })).toHaveLength(0));
    },
};

function WithActions() {
    const [opened, setOpened] = useState(0);
    const open = () => setOpened((count) => count + 1);
    return (
        <div className="flex w-60 flex-col gap-2">
            <TreeView
                nodes={[
                    {
                        id: 'shop',
                        content: <span className="flex-1">Shop API</span>,
                        rowClassName: `${row} text-fg gap-2 font-semibold`,
                        children: [],
                        onOpenActions: open,
                        actions: (
                            <IconButton
                                variant="ghost"
                                aria-label="Actions"
                                tabIndex={-1}
                                onClick={open}
                            >
                                …
                            </IconButton>
                        ),
                    },
                ]}
                aria-label="Collections"
                expandedIds={new Set()}
                onExpandedChange={fn()}
                onSelect={fn()}
            />
            <output className="text-fg-muted text-sm">{opened}</output>
        </div>
    );
}

export const RowActions: StoryObj<typeof WithActions> = {
    render: () => <WithActions />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.tab();
        await userEvent.keyboard('{Shift>}{F10}{/Shift}');
        await expect(canvas.getByRole('status')).toHaveTextContent('1');
    },
};
