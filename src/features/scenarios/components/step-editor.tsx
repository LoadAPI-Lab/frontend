import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { JsonBodyEditor } from '@/components/shared/json-body-editor';
import { KeyValueEditor } from '@/components/shared/key-value-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { HTTP_METHODS, isHttpMethod, methodColorClass } from '@/lib/http-method';

import { sendsBody, type StepDraft } from '../scenario-draft';
import type { SendBlock, StepSend } from '../use-step-sends';
import { StepResponse } from './step-response';

const methodItems = HTTP_METHODS.map((method) => ({ value: method, label: method }));

const tabClass =
    'text-base px-2.75 py-1.75 font-medium aria-selected:font-bold flex items-baseline gap-1.5';

function Count({ value }: { value: number }) {
    return value > 0 ? (
        <span className="text-fg-muted font-mono text-sm font-medium tabular-nums">{value}</span>
    ) : null;
}

const filledCount = (rows: StepDraft['headers']) =>
    rows.filter((row) => row.key.trim() !== '').length;

export interface StepEditorProps {
    step: StepDraft;
    number: number;
    variables: readonly string[];
    send: StepSend | undefined;
    sendBlock: SendBlock | null;
    onChange: (step: StepDraft) => void;
    onSend: () => void;
    onExtract: (path: string) => void;
}

function SendBlockText({ block }: { block: SendBlock }) {
    const { t } = useTranslation();
    if (block.kind !== 'needsValues') {
        return null;
    }
    const names = block.names.map((name) => `{{${name}}}`).join(', ');
    return block.fromStep === null
        ? t('scenarios.send.needsValues', { names, count: block.names.length })
        : t('scenarios.send.sendEarlier', {
              names,
              count: block.names.length,
              step: String(block.fromStep).padStart(2, '0'),
          });
}

export function StepEditor({
    step,
    number,
    variables,
    send,
    sendBlock,
    onChange,
    onSend,
    onExtract,
}: StepEditorProps) {
    const { t } = useTranslation();
    const withBody = sendsBody(step.method);
    const [tab, setTab] = useState(() => {
        if (send) {
            return 'response';
        }
        return withBody ? 'body' : 'extract';
    });
    let activeTab = !withBody && tab === 'body' ? 'headers' : tab;
    if (activeTab === 'response' && !send) {
        activeTab = 'extract';
    }
    const change = (changes: Partial<StepDraft>) => onChange({ ...step, ...changes });
    const blockId = `step-send-block-${step.id}`;
    const status = send?.outcome?.kind === 'response' ? send.outcome.status : null;

    return (
        <div className="border-border flex flex-col border-t">
            <div className="flex items-center gap-2 p-3">
                <Select.Root
                    items={methodItems}
                    value={step.method}
                    onValueChange={(next) => {
                        if (next && isHttpMethod(next)) {
                            change({ method: next });
                        }
                    }}
                >
                    <Select.Trigger
                        aria-label={t('scenarios.step.method', { number })}
                        className="w-28 shrink-0"
                    >
                        <Select.Value
                            className={cn(
                                'font-mono font-extrabold',
                                methodColorClass(step.method),
                            )}
                        />
                    </Select.Trigger>
                    <Select.Popup>
                        {methodItems.map((item) => (
                            <Select.Item
                                key={item.value}
                                value={item.value}
                                className={cn('font-mono font-bold', methodColorClass(item.value))}
                            >
                                {item.label}
                            </Select.Item>
                        ))}
                    </Select.Popup>
                </Select.Root>
                <Input
                    aria-label={t('scenarios.step.url', { number })}
                    value={step.url}
                    placeholder={t('scenarios.step.urlPlaceholder', { example: '{{taskId}}' })}
                    spellCheck={false}
                    autoComplete="off"
                    className="min-w-0 flex-1 font-mono"
                    onValueChange={(url) => change({ url })}
                />
                <Button
                    disabled={Boolean(sendBlock) || send?.sending}
                    aria-describedby={sendBlock?.kind === 'needsValues' ? blockId : undefined}
                    onClick={() => {
                        setTab('response');
                        onSend();
                    }}
                >
                    {send?.sending ? t('scenarios.send.sending') : t('scenarios.send.button')}
                </Button>
            </div>
            {sendBlock?.kind === 'needsValues' ? (
                <p
                    id={blockId}
                    className="text-fg-muted -mt-1 px-3 pb-2 text-base"
                >
                    <SendBlockText block={sendBlock} />
                </p>
            ) : null}
            <Tabs.Root
                value={activeTab}
                onValueChange={(next) => setTab(String(next))}
                className="flex min-h-0 flex-col"
            >
                <Tabs.List
                    aria-label={t('scenarios.step.parts', { number })}
                    className="mx-3 gap-0.5 self-start border-0 bg-transparent p-0"
                >
                    {withBody ? (
                        <Tabs.Tab
                            value="body"
                            className={tabClass}
                        >
                            {t('requestCard.tabs.body')}
                        </Tabs.Tab>
                    ) : null}
                    <Tabs.Tab
                        value="headers"
                        className={tabClass}
                    >
                        {t('requestCard.tabs.headers')}
                        <Count value={filledCount(step.headers)} />
                    </Tabs.Tab>
                    <Tabs.Tab
                        value="extract"
                        className={tabClass}
                    >
                        {t('scenarios.extract.tab')}
                        <Count value={filledCount(step.extract)} />
                    </Tabs.Tab>
                    {send ? (
                        <Tabs.Tab
                            value="response"
                            className={tabClass}
                        >
                            {t('scenarios.response.tab')}
                            {status === null ? null : (
                                <span
                                    className={cn(
                                        'font-mono text-sm font-bold tabular-nums',
                                        status < 400 ? 'text-accent' : 'text-danger',
                                    )}
                                >
                                    {status}
                                </span>
                            )}
                        </Tabs.Tab>
                    ) : null}
                </Tabs.List>
                {withBody ? (
                    <Tabs.Panel
                        value="body"
                        className="border-border bg-surface-code rounded-editor m-3 mt-2 overflow-hidden border"
                    >
                        <JsonBodyEditor
                            value={step.body}
                            onChange={(body) => change({ body })}
                            variables={variables}
                            variablesLabel={t('scenarios.step.insertVariable')}
                        />
                    </Tabs.Panel>
                ) : null}
                <Tabs.Panel
                    value="headers"
                    className="p-3 pt-2"
                >
                    <KeyValueEditor
                        rows={step.headers}
                        onChange={(headers) => change({ headers })}
                        keyLabel={t('requestCard.headers.name')}
                        valueLabel={t('requestCard.headers.value')}
                        addLabel={t('requestCard.headers.add')}
                        removeLabel={(index) => t('requestCard.headers.remove', { index })}
                        keyPlaceholder={t('requestCard.headers.namePlaceholder')}
                        valuePlaceholder={t('scenarios.step.headerValuePlaceholder', {
                            example: '{{token}}',
                        })}
                    />
                </Tabs.Panel>
                <Tabs.Panel
                    value="extract"
                    className="flex flex-col gap-2 p-3 pt-2"
                >
                    <p className="text-fg-muted text-base">
                        {t('scenarios.extract.help', { example: '{{taskId}}' })}
                    </p>
                    {send?.outcome?.kind === 'response' ? (
                        <p className="text-base">
                            <button
                                type="button"
                                className="text-accent focus-visible:ring-accent/40 rounded-sm font-semibold outline-none hover:underline focus-visible:ring-2"
                                onClick={() => setTab('response')}
                            >
                                {t('scenarios.extract.pickFromResponse')}
                            </button>
                        </p>
                    ) : (
                        <p className="text-fg-muted text-base">
                            {t('scenarios.extract.sendToPick')}
                        </p>
                    )}
                    <KeyValueEditor
                        rows={step.extract}
                        onChange={(extract) => change({ extract })}
                        keyLabel={t('scenarios.extract.name')}
                        valueLabel={t('scenarios.extract.path')}
                        addLabel={t('scenarios.extract.add')}
                        removeLabel={(index) => t('scenarios.extract.remove', { index })}
                        keyPlaceholder={t('scenarios.extract.namePlaceholder')}
                        valuePlaceholder={t('scenarios.extract.pathPlaceholder')}
                    />
                </Tabs.Panel>
                {send ? (
                    <Tabs.Panel
                        value="response"
                        className="p-3 pt-2"
                    >
                        <StepResponse
                            number={number}
                            send={send}
                            rules={step.extract}
                            onExtract={onExtract}
                        />
                    </Tabs.Panel>
                ) : null}
            </Tabs.Root>
        </div>
    );
}
