import { ArrowRight, ChevronDown, Download } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import type { KeyValueRow } from '@/lib/request-draft';

export interface ExtractSummaryProps {
    number: number;
    rules: readonly KeyValueRow[];
    defaultOpen?: boolean;
}

const CHIP_GAP = 6;

const chipClass =
    'bg-accent text-accent-fg truncate rounded-xs px-1.5 py-1 font-mono text-sm leading-none font-bold';

const moreClass = 'text-fg-muted shrink-0 font-mono text-sm';

export function fittingCount(available: number, widths: readonly number[], moreWidth: number) {
    if (available <= 0) {
        return widths.length;
    }
    const used = (count: number) =>
        widths.slice(0, count).reduce((sum, width) => sum + width, 0) +
        CHIP_GAP * Math.max(count - 1, 0);
    if (used(widths.length) <= available) {
        return widths.length;
    }
    let count = widths.length - 1;
    while (count > 0 && used(count) + CHIP_GAP + moreWidth > available) {
        count -= 1;
    }
    return count;
}

function ChipPreview({ names }: { names: readonly string[] }) {
    const { t } = useTranslation();
    const box = useRef<HTMLSpanElement>(null);
    const ruler = useRef<HTMLSpanElement>(null);
    const [visible, setVisible] = useState(names.length);

    useLayoutEffect(() => {
        const measure = () => {
            const element = box.current;
            const sample = ruler.current;
            if (!element || !sample) {
                return;
            }
            const items = [...sample.children].map((child) => child.getBoundingClientRect().width);
            const moreWidth = items.pop() ?? 0;
            setVisible(fittingCount(element.clientWidth, items, moreWidth));
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        for (const element of [box.current, ruler.current]) {
            if (element) {
                observer?.observe(element);
            }
        }
        return () => observer?.disconnect();
    }, []);

    const hidden = names.length - visible;
    return (
        <span
            ref={box}
            className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
        >
            <span
                ref={ruler}
                aria-hidden
                className="invisible absolute top-0 left-0 flex w-max gap-1.5"
            >
                {names.map((name, index) => (
                    <span
                        // oxlint-disable-next-line react/no-array-index-key
                        key={index}
                        className={cn(chipClass, 'shrink-0')}
                    >
                        {name}
                    </span>
                ))}
                <span className={moreClass}>
                    {t('scenarios.extract.more', { count: names.length })}
                </span>
            </span>
            {names.slice(0, visible).map((name, index) => (
                <span
                    // oxlint-disable-next-line react/no-array-index-key
                    key={index}
                    className={cn(chipClass, 'shrink-0')}
                >
                    {name}
                </span>
            ))}
            {hidden > 0 ? (
                <span className={moreClass}>{t('scenarios.extract.more', { count: hidden })}</span>
            ) : null}
        </span>
    );
}

export function ExtractSummary({ number, rules, defaultOpen = false }: ExtractSummaryProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(defaultOpen);
    const listId = useId();

    return (
        <div className="border-accent/25 bg-accent/5 flex flex-col rounded-md border">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                className="focus-visible:ring-accent/40 flex min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2"
                onClick={() => setOpen(!open)}
            >
                <span className="text-fg-muted tracking-label text-2xs flex shrink-0 items-center gap-1.5 leading-none font-semibold uppercase">
                    <Download
                        aria-hidden
                        className="text-accent size-3 shrink-0"
                    />
                    {t('scenarios.extract.label')}
                    <span className="font-mono tabular-nums">{rules.length}</span>
                </span>
                {open ? null : <ChipPreview names={rules.map((rule) => rule.key.trim())} />}
                <ChevronDown
                    aria-hidden
                    className={cn(
                        'text-fg-muted ml-auto size-3.5 shrink-0 transition-transform motion-reduce:transition-none',
                        open && 'rotate-180',
                    )}
                />
            </button>
            <ul
                id={listId}
                hidden={!open}
                aria-label={t('scenarios.extract.listLabel', { number })}
                className="grid grid-cols-[minmax(0,max-content)_auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 px-3 pb-2.5"
            >
                {rules.map((rule) => (
                    <li
                        key={rule.id}
                        className="col-span-3 grid grid-cols-subgrid items-center"
                    >
                        <span className="text-fg truncate font-mono text-base">
                            {rule.value.trim() || '…'}
                        </span>
                        <ArrowRight
                            aria-hidden
                            className="text-fg-muted size-3 shrink-0"
                        />
                        <span className="sr-only">{t('scenarios.extract.into')}</span>
                        <span className={cn(chipClass, 'justify-self-start')}>
                            {rule.key.trim()}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
