import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type TreeNode, TreeView } from './tree-view';

const leaf = (id: string): TreeNode => ({ id, content: id });

const nodes: TreeNode[] = [
    {
        id: 'shop',
        content: 'Shop API',
        children: [
            {
                id: 'products',
                content: 'products',
                children: [leaf('GET /products')],
            },
            leaf('GET /health'),
        ],
    },
    { id: 'billing', content: 'Billing', children: [leaf('GET /invoices')] },
];

function Harness({ onSelect }: { onSelect: (node: TreeNode) => void }) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
            onSelect={onSelect}
        />
    );
}

const item = (name: string) => screen.getByRole('treeitem', { name });

describe('TreeView', () => {
    it('has a single tab stop on the first item', () => {
        render(<Harness onSelect={vi.fn<(node: TreeNode) => void>()} />);
        expect(item('Shop API')).toHaveAttribute('tabindex', '0');
        expect(item('Billing')).toHaveAttribute('tabindex', '-1');
    });

    it('moves, expands and collapses with the arrow keys', async () => {
        render(<Harness onSelect={vi.fn<(node: TreeNode) => void>()} />);
        await userEvent.tab();
        expect(item('Shop API')).toHaveFocus();

        await userEvent.keyboard('{ArrowRight}');
        expect(item('Shop API')).toHaveAttribute('aria-expanded', 'true');
        await userEvent.keyboard('{ArrowRight}');
        expect(item('products')).toHaveFocus();
        await userEvent.keyboard('{ArrowDown}');
        expect(item('GET /health')).toHaveFocus();
        await userEvent.keyboard('{ArrowLeft}');
        expect(item('Shop API')).toHaveFocus();
        await userEvent.keyboard('{ArrowLeft}');
        expect(item('Shop API')).toHaveAttribute('aria-expanded', 'false');
    });

    it('jumps with Home and End', async () => {
        render(<Harness onSelect={vi.fn<(node: TreeNode) => void>()} />);
        await userEvent.tab();
        await userEvent.keyboard('{End}');
        expect(item('Billing')).toHaveFocus();
        await userEvent.keyboard('{Home}');
        expect(item('Shop API')).toHaveFocus();
    });

    it('selects a leaf with Enter and by clicking', async () => {
        const onSelect = vi.fn<(node: TreeNode) => void>();
        render(<Harness onSelect={onSelect} />);
        await userEvent.tab();
        await userEvent.keyboard('{Enter}{ArrowDown}{ArrowDown}');
        expect(item('GET /health')).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'GET /health' }));

        await userEvent.click(screen.getByText('Billing'));
        await userEvent.click(screen.getByText('GET /invoices'));
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'GET /invoices' }));
    });
});
