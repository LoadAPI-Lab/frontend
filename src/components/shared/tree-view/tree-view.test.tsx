import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

function allowMotion() {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

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

    it('animates the children in and lets them fade out before collapsing', () => {
        allowMotion();
        vi.useFakeTimers();
        render(<Harness onSelect={vi.fn<(node: TreeNode) => void>()} />);

        act(() => item('Shop API').click());
        expect(item('products')).toHaveClass('motion-safe:animate-tree-in');
        expect(item('GET /health')).toHaveStyle({ animationDelay: '12ms' });

        act(() => item('Shop API').click());
        expect(item('products')).toHaveClass('motion-safe:animate-tree-out');
        expect(item('Shop API')).toHaveAttribute('aria-expanded', 'true');

        act(() => {
            vi.advanceTimersByTime(120);
        });
        expect(screen.queryByRole('treeitem', { name: 'products' })).not.toBeInTheDocument();
        expect(item('Shop API')).toHaveAttribute('aria-expanded', 'false');
    });

    it('collapses at once when reduced motion is preferred', () => {
        render(<Harness onSelect={vi.fn<(node: TreeNode) => void>()} />);
        act(() => item('Shop API').click());
        act(() => item('Shop API').click());
        expect(screen.queryByRole('treeitem', { name: 'products' })).not.toBeInTheDocument();
    });

    it('opens the actions of a row with Shift+F10 or the Menu key', async () => {
        const onOpenActions = vi.fn<() => void>();
        render(
            <TreeView
                nodes={[
                    { id: 'shop', content: 'Shop API', children: [], onOpenActions },
                    leaf('x'),
                ]}
                aria-label="Collections"
                expandedIds={new Set()}
                onExpandedChange={vi.fn<(id: string, open: boolean) => void>()}
                onSelect={vi.fn<(node: TreeNode) => void>()}
            />,
        );
        expect(item('Shop API')).toHaveAttribute('aria-keyshortcuts', 'Shift+F10');
        expect(item('x')).not.toHaveAttribute('aria-keyshortcuts');
        await userEvent.tab();
        await userEvent.keyboard('{Shift>}{F10}{/Shift}');
        await userEvent.keyboard('{ContextMenu}');
        expect(onOpenActions).toHaveBeenCalledTimes(2);
    });

    it('keeps clicks and keys inside row actions away from the row', async () => {
        const onExpandedChange = vi.fn<(id: string, open: boolean) => void>();
        const onAction = vi.fn<() => void>();
        render(
            <TreeView
                nodes={[
                    {
                        id: 'shop',
                        content: 'Shop API',
                        children: [],
                        actions: (
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={onAction}
                            >
                                More
                            </button>
                        ),
                    },
                ]}
                aria-label="Collections"
                expandedIds={new Set()}
                onExpandedChange={onExpandedChange}
                onSelect={vi.fn<(node: TreeNode) => void>()}
            />,
        );
        const more = screen.getByText('More');
        await userEvent.click(more);
        more.focus();
        await userEvent.keyboard('{Enter}');
        expect(onAction).toHaveBeenCalledTimes(2);
        expect(onExpandedChange).not.toHaveBeenCalled();
        expect(item('Shop API')).toHaveAccessibleName('Shop API');
    });
});
