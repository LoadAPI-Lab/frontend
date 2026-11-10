import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

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
    actions?: ReactNode;
    onOpenActions?: () => void;
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

const CLOSE_MS = 120;
const STAGGER_MS = 12;
const MAX_STAGGER_STEPS = 12;

function motionAllowed() {
    return (
        typeof window.matchMedia === 'function' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function isInside(id: string, ancestor: string, parentOf: ReadonlyMap<string, string | null>) {
    let current = parentOf.get(id) ?? null;
    while (current !== null) {
        if (current === ancestor) {
            return true;
        }
        current = parentOf.get(current) ?? null;
    }
    return false;
}

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
    const [opening, setOpening] = useState<string | null>(null);
    const [closing, setClosing] = useState<string | null>(null);
    const pendingClose = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
    const parentOf = new Map(items.map((item) => [item.node.id, item.parentId]));

    useEffect(
        () => () => {
            if (pendingClose.current) {
                clearTimeout(pendingClose.current.timer);
            }
        },
        [],
    );

    const setExpanded = (id: string, open: boolean) => {
        const pending = pendingClose.current;
        if (pending) {
            clearTimeout(pending.timer);
            pendingClose.current = null;
            setClosing(null);
            if (pending.id !== id || !open) {
                onExpandedChange(pending.id, false);
            }
            if (pending.id === id) {
                return;
            }
        }
        if (open || !motionAllowed()) {
            setOpening(open ? id : null);
            onExpandedChange(id, open);
            return;
        }
        setClosing(id);
        pendingClose.current = {
            id,
            timer: setTimeout(() => {
                pendingClose.current = null;
                setClosing(null);
                onExpandedChange(id, false);
            }, CLOSE_MS),
        };
    };

    const motionClass = (id: string, step: number) => {
        if (closing && isInside(id, closing, parentOf)) {
            return { className: 'motion-safe:animate-tree-out' };
        }
        if (opening && isInside(id, opening, parentOf)) {
            return {
                className: 'motion-safe:animate-tree-in',
                style: { animationDelay: `${Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS}ms` },
            };
        }
        return { className: undefined };
    };

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
            setExpanded(node.id, !expandedIds.has(node.id));
        } else {
            onSelect(node);
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, item: VisibleItem) => {
        const openActions = event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
        if (openActions) {
            if (item.node.onOpenActions) {
                event.preventDefault();
                item.node.onOpenActions();
            }
            return;
        }
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
                    setExpanded(node.id, true);
                }
            },
            ArrowLeft: () => {
                if (isParent(node) && expanded) {
                    setExpanded(node.id, false);
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

    const firstOpened = rows.findIndex(
        (row) =>
            row.kind === 'item' &&
            opening !== null &&
            isInside(row.item.node.id, opening, parentOf),
    );

    return (
        <ul
            role="tree"
            aria-label={ariaLabel}
            className={className}
        >
            {rows.map((row, index) => {
                if (row.kind === 'pending') {
                    const pendingMotion =
                        opening === row.parentId ? 'motion-safe:animate-tree-in' : undefined;
                    return (
                        <li
                            key={`${row.parentId}:pending`}
                            role="none"
                            className={pendingMotion}
                        >
                            {row.content}
                        </li>
                    );
                }
                const { item } = row;
                const { node } = item;
                const parent = isParent(node);
                const motion = motionClass(node.id, index - Math.max(firstOpened, 0));
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
                        aria-keyshortcuts={node.onOpenActions ? 'Shift+F10' : undefined}
                        tabIndex={node.id === tabStop ? 0 : -1}
                        onFocus={() => setFocusedId(node.id)}
                        onKeyDown={(event) => onKeyDown(event, item)}
                        onClick={() => {
                            focus(node.id);
                            activate(node);
                        }}
                        style={motion.style}
                        className={cn(
                            'group/tree-row cursor-pointer select-none outline-none',
                            'focus-visible:ring-2',
                            'focus-visible:ring-accent/40',
                            node.rowClassName,
                            motion.className,
                        )}
                    >
                        {node.content}
                        {node.actions ? (
                            <span
                                role="presentation"
                                aria-hidden
                                className="contents"
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                            >
                                {node.actions}
                            </span>
                        ) : null}
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
