import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import {
    type CSSProperties,
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { MethodBadge } from '@/components/shared/method-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import {
    type HistoryStatus,
    type HistoryType,
    historyQuery,
    type RunListItem,
} from './history-api';
import { filterRuns, groupByEndpoint, type EndpointGroup, endpointKey } from './history-filter';
import { type DayGroup, dayGroup, formatRunTime, runPath } from './history-format';
import { STATUS_TEXT } from './run-status';

const GROUP_ORDER: DayGroup[] = ['today', 'yesterday', 'thisWeek', 'earlier'];
const COLLAPSED_KEY = 'routelab.history.collapsed';

const isDayGroup = (value: unknown): value is DayGroup =>
    GROUP_ORDER.some((group) => group === value);

function readCollapsed(): ReadonlySet<DayGroup> {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? '[]');
        return new Set(Array.isArray(parsed) ? parsed.filter(isDayGroup) : []);
    } catch {
        return new Set();
    }
}

const CLOSE_MS = 120;
const STAGGER_MS = 12;
const MAX_STAGGER_STEPS = 12;

function motionAllowed() {
    return (
        typeof window.matchMedia === 'function' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function useCollapsedGroups() {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const toggle = useCallback((group: DayGroup) => {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            try {
                window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
            } catch {
                return next;
            }
            return next;
        });
    }, []);
    return [collapsed, toggle] as const;
}

function useAnimatedGroups() {
    const [collapsed, toggle] = useCollapsedGroups();
    const [opening, setOpening] = useState<DayGroup | null>(null);
    const [closing, setClosing] = useState<DayGroup | null>(null);
    const pendingClose = useRef<{ group: DayGroup; timer: ReturnType<typeof setTimeout> } | null>(
        null,
    );

    useEffect(
        () => () => {
            if (pendingClose.current) {
                clearTimeout(pendingClose.current.timer);
            }
        },
        [],
    );

    const setOpen = (group: DayGroup) => {
        const pending = pendingClose.current;
        if (pending) {
            clearTimeout(pending.timer);
            pendingClose.current = null;
            setClosing(null);
            if (pending.group === group) {
                return;
            }
            toggle(pending.group);
        }
        const open = collapsed.has(group);
        if (open || !motionAllowed()) {
            setOpening(open ? group : null);
            toggle(group);
            return;
        }
        setClosing(group);
        pendingClose.current = {
            group,
            timer: setTimeout(() => {
                pendingClose.current = null;
                setClosing(null);
                toggle(group);
            }, CLOSE_MS),
        };
    };

    const rowMotion = (group: DayGroup, step: number): RowMotion => {
        if (closing === group) {
            return { className: 'motion-safe:animate-tree-out' };
        }
        if (opening === group) {
            return {
                className: 'motion-safe:animate-tree-in',
                style: { animationDelay: `${Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS}ms` },
            };
        }
        return {};
    };

    return { collapsed, closing, setOpen, rowMotion };
}

type RowMotion = { className?: string; style?: CSSProperties };

export interface RunsListProps {
    type: HistoryType | undefined;
    status?: HistoryStatus;
    query?: string;
    grouped?: boolean;
    filtered?: boolean;
    onClearFilters?: () => void;
    selectedId: string | undefined;
    className?: string;
}

function RunRow({
    run,
    selected,
    motion,
}: {
    run: RunListItem;
    selected: boolean;
    motion?: RowMotion;
}) {
    const { t, i18n } = useTranslation();
    const format = (value: number) => formatNumber(value, 0, i18n.language);
    const time = formatRunTime(run.createdAt, i18n.language);
    const single = run.type === 'single';
    const title = single && run.request ? runPath(run.request.url) : t(`history.types.${run.type}`);
    const meta = single
        ? t('history.row.single', {
              rps: format(run.targetRps ?? 0),
              duration: format(run.durationSeconds ?? 0),
              time,
          })
        : t('history.row.scenario', { count: run.stepsCount ?? 0, time });
    let figure: { label: string; value: string } | null = null;
    if (single && run.p95Ms !== undefined) {
        figure = {
            label: t('history.row.p95Label'),
            value: t('history.row.p95', { value: format(run.p95Ms) }),
        };
    } else if (!single && run.okCount !== undefined && run.stepsCount !== undefined) {
        figure = {
            label: t('history.row.stepsLabel'),
            value: `${run.okCount}/${run.stepsCount}`,
        };
    }

    return (
        <li
            className={motion?.className}
            style={motion?.style}
        >
            <Link
                to="/history"
                search={(previous) => ({ ...previous, run: run.id })}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                    'focus-visible:ring-accent/40 flex items-center gap-3 rounded-lg border px-3 py-2.5 outline-none focus-visible:ring-2',
                    selected
                        ? 'border-border-strong bg-surface-selected'
                        : 'hover:bg-surface-input border-transparent',
                )}
            >
                {single && run.request ? (
                    <MethodBadge
                        method={run.request.method}
                        size="md"
                        className="w-10 shrink-0"
                    />
                ) : (
                    <span className="bg-surface-2 text-fg-muted flex h-6 w-10 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold">
                        {t(`history.typeShort.${run.type}`)}
                    </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-fg truncate font-mono text-base">{title}</span>
                    <span className="text-fg-muted truncate text-sm">{meta}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {figure ? (
                        <span className="flex items-baseline gap-1.5 font-mono tabular-nums">
                            <span className="text-fg-muted text-xs font-normal">
                                {figure.label}
                            </span>
                            <span className="text-fg text-base font-bold">{figure.value}</span>
                        </span>
                    ) : null}
                    <span
                        className={cn('text-xs font-semibold uppercase', STATUS_TEXT[run.status])}
                    >
                        {t(`runStatus.${run.status}`)}
                    </span>
                </span>
            </Link>
        </li>
    );
}

function EndpointGroupItem({
    group,
    open,
    onToggle,
    selectedId,
}: {
    group: EndpointGroup;
    open: boolean;
    onToggle: () => void;
    selectedId: string | undefined;
}) {
    const { t, i18n } = useTranslation();
    const id = `history-endpoint-${group.latest.id}`;
    const { latest } = group;

    return (
        <li className="flex flex-col gap-1">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-runs`}
                onClick={onToggle}
                className="hover:bg-surface-input focus-visible:ring-accent/40 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left outline-none focus-visible:ring-2"
            >
                <ChevronRight
                    aria-hidden
                    className={cn(
                        'text-fg-muted -ml-1 size-3 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
                        open && 'rotate-90',
                    )}
                />
                {group.method ? (
                    <MethodBadge
                        method={group.method}
                        size="md"
                        className="w-10 shrink-0"
                    />
                ) : (
                    <span className="bg-surface-2 text-fg-muted flex h-6 w-10 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold">
                        {t(`history.typeShort.${group.type}`)}
                    </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-fg truncate font-mono text-base">
                        {group.path ?? t(`history.types.${group.type}`)}
                    </span>
                    <span className="text-fg-muted truncate text-sm">
                        {t('history.endpointGroup.meta', {
                            count: group.runs.length,
                            time: formatRunTime(latest.createdAt, i18n.language),
                        })}
                    </span>
                </span>
                <span
                    className={cn(
                        'shrink-0 text-xs font-semibold uppercase',
                        STATUS_TEXT[latest.status],
                    )}
                >
                    {t(`runStatus.${latest.status}`)}
                </span>
            </button>
            {open ? (
                <ul
                    id={`${id}-runs`}
                    className="border-border ml-4 flex flex-col gap-1 border-l pl-2"
                >
                    {group.runs.map((run) => (
                        <RunRow
                            key={run.id}
                            run={run}
                            selected={run.id === selectedId}
                        />
                    ))}
                </ul>
            ) : null}
        </li>
    );
}

function EndpointGroups({
    runs,
    selectedId,
}: {
    runs: readonly RunListItem[];
    selectedId: string | undefined;
}) {
    const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(() => new Map());
    const selected = runs.find((run) => run.id === selectedId);
    const selectedKey = selected ? endpointKey(selected) : undefined;
    const isOpen = (key: string) => toggled.get(key) ?? key === selectedKey;
    const toggle = (key: string) => {
        const open = !isOpen(key);
        setToggled((current) => new Map(current).set(key, open));
    };

    return (
        <ul className="flex flex-col gap-1">
            {groupByEndpoint(runs).map((group) => (
                <EndpointGroupItem
                    key={group.key}
                    group={group}
                    open={isOpen(group.key)}
                    onToggle={() => toggle(group.key)}
                    selectedId={selectedId}
                />
            ))}
        </ul>
    );
}

export function RunsList({
    type,
    status,
    query,
    grouped = false,
    filtered = false,
    onClearFilters,
    selectedId,
    className,
}: RunsListProps) {
    const { t } = useTranslation();
    const history = useInfiniteQuery(historyQuery(type, status));
    const { collapsed, closing, setOpen, rowMotion } = useAnimatedGroups();

    if (history.isPending) {
        return (
            <div
                aria-label={t('history.loading')}
                className={cn('flex flex-col gap-2', className)}
            >
                {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton
                        key={index}
                        className="h-14 w-full"
                    />
                ))}
            </div>
        );
    }
    if (history.isError) {
        return (
            <ErrorState
                size="compact"
                message={history.error.message}
                onRetry={() => void history.refetch()}
                retrying={history.isRefetching}
                className={className}
            />
        );
    }

    const items = history.data.pages.flatMap((page) => page.items);
    if (items.length === 0 && !filtered) {
        return (
            <EmptyState
                size="compact"
                title={t('history.empty.title')}
                description={t('history.empty.body')}
                action={
                    <Link
                        to="/tests"
                        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                        {t('history.empty.action')}
                    </Link>
                }
                className={className}
            />
        );
    }

    const visible = filterRuns(items, query);
    const groups = GROUP_ORDER.map((group) => ({
        group,
        runs: visible.filter((item) => dayGroup(item.createdAt) === group),
    })).filter(({ runs }) => runs.length > 0);

    let content: ReactNode;
    if (visible.length === 0) {
        content = (
            <EmptyState
                size="compact"
                title={t('history.noMatch.title')}
                description={
                    history.hasNextPage ? t('history.noMatch.bodyMore') : t('history.noMatch.body')
                }
                action={
                    onClearFilters ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onClearFilters}
                        >
                            {t('history.noMatch.action')}
                        </Button>
                    ) : null
                }
            />
        );
    } else if (grouped) {
        content = (
            <EndpointGroups
                runs={visible}
                selectedId={selectedId}
            />
        );
    } else {
        content = groups.map(({ group, runs }) => (
            <section
                key={group}
                aria-labelledby={`history-group-${group}`}
                className="flex flex-col gap-1"
            >
                <h3
                    id={`history-group-${group}`}
                    className="text-fg-muted tracking-label text-xs font-semibold uppercase"
                >
                    <button
                        type="button"
                        aria-expanded={!collapsed.has(group) && closing !== group}
                        aria-controls={`history-group-${group}-runs`}
                        onClick={() => setOpen(group)}
                        className="hover:text-fg focus-visible:ring-accent/40 flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-left uppercase outline-none focus-visible:ring-2"
                    >
                        <ChevronRight
                            aria-hidden
                            className={cn(
                                'size-3 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
                                !collapsed.has(group) && closing !== group && 'rotate-90',
                            )}
                        />
                        {t(`history.groups.${group}`)}
                        <span className="text-fg-faint ml-auto font-mono font-normal normal-case">
                            {runs.length}
                        </span>
                    </button>
                </h3>
                {collapsed.has(group) ? null : (
                    <ul
                        id={`history-group-${group}-runs`}
                        className="flex flex-col gap-1"
                    >
                        {runs.map((run, index) => (
                            <RunRow
                                key={run.id}
                                run={run}
                                selected={run.id === selectedId}
                                motion={rowMotion(group, index)}
                            />
                        ))}
                    </ul>
                )}
            </section>
        ));
    }

    return (
        <nav
            aria-label={t('history.listLabel')}
            className={cn('flex flex-col gap-4', className)}
        >
            {content}
            {history.hasNextPage ? (
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={history.isFetchingNextPage}
                    onClick={() => void history.fetchNextPage()}
                    className="self-center"
                >
                    {history.isFetchingNextPage ? t('history.loadingMore') : t('history.loadMore')}
                </Button>
            ) : null}
        </nav>
    );
}
