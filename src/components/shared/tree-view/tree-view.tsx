import type { KeyboardEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';

import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

export interface TreeNode {
    id: string;
    content: ReactNode;
    children?: TreeNode[];
    busy?: boolean;
    pending?: ReactNode;
    rowClassName?: string;
    tooltip?: string;
}

export interface TreeViewProps {
    nodes: TreeNode[];
    'aria-label': string;
    expandedIds: ReadonlySet<string>;
    onExpandedChange: (id: string, expanded: boolean) => void;
    selectedId?: string | null;
    onSelect: (node: TreeNode) => void;
    className?: string;
}

interface VisibleItem {
    node: TreeNode;
    parentId: string | null;
    level: number;
    position: number;
    setSize: number;
}

type Row =
    | { kind: 'item'; item: VisibleItem }
    | { kind: 'pending'; parentId: string; content: ReactNode };

const isParent = (node: TreeNode) => node.children !== undefined;

function flatten(
    nodes: TreeNode[],
    expanded: ReadonlySet<string>,
    parentId: string | null = null,
    level = 1,
): Row[] {
    return nodes.flatMap((node, index): Row[] => {
        const row: Row = {
            kind: 'item',
            item: { node, parentId, level, position: index + 1, setSize: nodes.length },
        };
        if (!node.children || !expanded.has(node.id)) {
            return [row];
        }
        if (node.busy) {
            return [row, { kind: 'pending', parentId: node.id, content: node.pending }];
        }
        return [row, ...flatten(node.children, expanded, node.id, level + 1)];
    });
}

export function TreeView({
    nodes,
    'aria-label': ariaLabel,
    expandedIds,
    onExpandedChange,
    selectedId,
    onSelect,
    className,
}: TreeViewProps) {
    const rows = flatten(nodes, expandedIds);
    const items = rows.flatMap((row) => (row.kind === 'item' ? [row.item] : []));
    const ids = items.map((item) => item.node.id);
    const elements = useRef(new Map<string, HTMLLIElement>());
    const [focusedId, setFocusedId] = useState<string | null>(null);

    let tabStop = ids[0] ?? null;
    if (selectedId && ids.includes(selectedId)) {
        tabStop = selectedId;
    }
    if (focusedId && ids.includes(focusedId)) {
        tabStop = focusedId;
    }

    const focus = (id: string | null | undefined) => {
        if (!id) {
            return;
        }
        setFocusedId(id);
        elements.current.get(id)?.focus();
    };

    const activate = (node: TreeNode) => {
        if (isParent(node)) {
            onExpandedChange(node.id, !expandedIds.has(node.id));
        } else {
            onSelect(node);
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, item: VisibleItem) => {
        const index = ids.indexOf(item.node.id);
        const { node, parentId } = item;
        const expanded = expandedIds.has(node.id);
        const handlers: Record<string, () => void> = {
            ArrowDown: () => focus(ids[index + 1]),
            ArrowUp: () => focus(ids[index - 1]),
            Home: () => focus(ids[0]),
            End: () => focus(ids.at(-1)),
            ArrowRight: () => {
                if (!isParent(node)) {
                    return;
                }
                if (expanded) {
                    focus(node.busy ? null : node.children?.[0]?.id);
                } else {
                    onExpandedChange(node.id, true);
                }
            },
            ArrowLeft: () => {
                if (isParent(node) && expanded) {
                    onExpandedChange(node.id, false);
                } else {
                    focus(parentId);
                }
            },
            Enter: () => activate(node),
            ' ': () => activate(node),
        };
        const handler = handlers[event.key];
        if (handler) {
            event.preventDefault();
            handler();
        }
    };

    return (
        <ul
            role="tree"
            aria-label={ariaLabel}
            className={className}
        >
            {rows.map((row) => {
                if (row.kind === 'pending') {
                    return (
                        <li
                            key={`${row.parentId}:pending`}
                            role="none"
                        >
                            {row.content}
                        </li>
                    );
                }
                const { item } = row;
                const { node } = item;
                const parent = isParent(node);
                const treeItem = (
                    <li
                        key={node.id}
                        ref={(element) => {
                            if (element) {
                                elements.current.set(node.id, element);
                            } else {
                                elements.current.delete(node.id);
                            }
                        }}
                        role="treeitem"
                        aria-level={item.level}
                        aria-posinset={item.position}
                        aria-setsize={item.setSize}
                        aria-expanded={parent ? expandedIds.has(node.id) : undefined}
                        aria-busy={(node.busy && expandedIds.has(node.id)) || undefined}
                        aria-selected={parent ? undefined : node.id === selectedId}
                        tabIndex={node.id === tabStop ? 0 : -1}
                        onFocus={() => setFocusedId(node.id)}
                        onKeyDown={(event) => onKeyDown(event, item)}
                        onClick={() => {
                            focus(node.id);
                            activate(node);
                        }}
                        className={cn(
                            'cursor-pointer select-none outline-none',
                            'focus-visible:ring-2',
                            'focus-visible:ring-accent/40',
                            node.rowClassName,
                        )}
                    >
                        {node.content}
                    </li>
                );
                if (!node.tooltip) {
                    return treeItem;
                }
                return (
                    <Tooltip.Root key={node.id}>
                        <Tooltip.Trigger render={treeItem} />
                        <Tooltip.Content side="right">
                            <span className="font-mono">{node.tooltip}</span>
                        </Tooltip.Content>
                    </Tooltip.Root>
                );
            })}
        </ul>
    );
}
