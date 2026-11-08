import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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
