import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { JsonBodyEditor } from '@/components/shared/json-body-editor';
import { KeyValueEditor } from '@/components/shared/key-value-editor';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { headerCount, paramCount, type RequestDraft } from '@/lib/request-draft';

import { AuthEditor } from './auth-editor';

export interface RequestCardProps {
    draft: RequestDraft;
    onDraftChange: (draft: RequestDraft) => void;
    pathParams: string[];
    onFillExample?: () => void;
    className?: string;
}

const tabClass =
    'text-base px-2.75 py-1.75 font-medium aria-selected:font-bold flex items-baseline gap-1.5';

function Count({ value }: { value: number }) {
    return value > 0 ? (
        <span className="text-fg-muted font-mono text-sm font-medium tabular-nums">{value}</span>
    ) : null;
}

export function RequestCard({
    draft,
    onDraftChange,
    pathParams,
    onFillExample,
    className,
}: RequestCardProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState('body');
    const change = (changes: Partial<RequestDraft>) => onDraftChange({ ...draft, ...changes });

    return (
        <section
            aria-label={t('requestCard.label')}
            className={cn(
                'bg-surface-1 border-border flex min-h-0 flex-col overflow-hidden rounded-card border',
                className,
            )}
        >
            <Tabs.Root
                value={tab}
                onValueChange={(next) => setTab(String(next))}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-3">
                    <Tabs.List
                        aria-label={t('requestCard.label')}
                        className="gap-0.5 border-0 bg-transparent p-0"
                    >
                        <Tabs.Tab
                            value="body"
                            className={tabClass}
                        >
                            {t('requestCard.tabs.body')}
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="headers"
                            className={tabClass}
                        >
                            {t('requestCard.tabs.headers')}
                            <Count value={headerCount(draft)} />
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="auth"
                            className={tabClass}
                        >
                            {t('requestCard.tabs.auth')}
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="params"
                            className={tabClass}
                        >
                            {t('requestCard.tabs.params')}
                            <Count value={paramCount(draft)} />
                        </Tabs.Tab>
                    </Tabs.List>
                    {tab === 'body' ? (
                        <div className="flex items-center gap-2">
                            {onFillExample ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onFillExample}
                                >
                                    {t('requestCard.fillExample')}
                                </Button>
                            ) : null}
                            <span className="border-border-strong text-fg-muted rounded-sm border px-2 py-1 font-mono text-sm">
                                {t('requestCard.rawJson')}
                            </span>
                        </div>
                    ) : null}
                </div>
                <Tabs.Panel
                    value="body"
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <JsonBodyEditor
                        value={draft.body}
                        onChange={(body) => change({ body })}
                        className="flex-1"
                    />
                </Tabs.Panel>
                <Tabs.Panel
                    value="headers"
                    className="p-4"
                >
                    <KeyValueEditor
                        rows={draft.headers}
                        onChange={(headers) => change({ headers })}
                        keyLabel={t('requestCard.headers.name')}
                        valueLabel={t('requestCard.headers.value')}
                        addLabel={t('requestCard.headers.add')}
                        removeLabel={(index) => t('requestCard.headers.remove', { index })}
                        keyPlaceholder={t('requestCard.headers.namePlaceholder')}
                        valuePlaceholder={t('requestCard.headers.valuePlaceholder')}
                    />
                </Tabs.Panel>
                <Tabs.Panel
                    value="auth"
                    className="p-4"
                >
                    <AuthEditor
                        auth={draft.auth}
                        onChange={(auth) => change({ auth })}
                    />
                </Tabs.Panel>
                <Tabs.Panel
                    value="params"
                    className="flex flex-col gap-5 p-4"
                >
                    {pathParams.length > 0 ? (
                        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                            <legend className="text-fg-muted tracking-label mb-2 p-0 text-xs font-semibold uppercase">
                                {t('requestCard.params.path')}
                            </legend>
                            {pathParams.map((name) => (
                                <Field.Root
                                    key={name}
                                    className="flex-row items-center gap-3"
                                >
                                    <Field.Label className="w-32 shrink-0 font-mono">
                                        {name}
                                    </Field.Label>
                                    <Input
                                        value={draft.pathParams[name] ?? ''}
                                        spellCheck={false}
                                        className="font-mono"
                                        onValueChange={(value) =>
                                            change({
                                                pathParams: { ...draft.pathParams, [name]: value },
                                            })
                                        }
                                    />
                                </Field.Root>
                            ))}
                        </fieldset>
                    ) : null}
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                        <legend className="text-fg-muted tracking-label mb-2 p-0 text-xs font-semibold uppercase">
                            {t('requestCard.params.query')}
                        </legend>
                        <KeyValueEditor
                            rows={draft.query}
                            onChange={(query) => change({ query })}
                            keyLabel={t('requestCard.params.name')}
                            valueLabel={t('requestCard.params.value')}
                            addLabel={t('requestCard.params.add')}
                            removeLabel={(index) => t('requestCard.params.remove', { index })}
                            keyPlaceholder={t('requestCard.params.namePlaceholder')}
                            valuePlaceholder={t('requestCard.params.valuePlaceholder')}
                        />
                    </fieldset>
                </Tabs.Panel>
            </Tabs.Root>
        </section>
    );
}
