import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { NumberField } from '@/components/ui/number-field';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import { estimateRequests, LOAD_PRESETS, type LoadPresetId, matchPreset } from './load-presets';
import { PresetSelect } from './preset-select';
import type { ConfigField, ConfigIssue, ConfigIssues, TestConfig } from './test-config';
import type { SendBlock } from './use-send-request';
import type { RunPhase, StartBlock } from './use-test-run-controls';

export interface TestConfigBarProps {
    config: TestConfig;
    onConfigChange: (config: TestConfig) => void;
    issues: ConfigIssues;
    block: StartBlock | null;
    phase: RunPhase;
    onStart: () => void;
    onStop: () => void;
    sendBlock?: SendBlock | null;
    sending?: boolean;
    onSend?: () => void;
    onCancelSend?: () => void;
    className?: string;
}

function IssueText({ issue }: { issue: ConfigIssue }) {
    const { t } = useTranslation();
    if (issue.kind === 'required') {
        return t('testConfig.issues.required');
    }
    if (issue.kind === 'wholeNumber') {
        return t('testConfig.issues.wholeNumber');
    }
    if (issue.kind === 'range') {
        return t('testConfig.issues.range', { min: issue.min, max: issue.max });
    }
    return t('testConfig.issues.rampLongerThanDuration', { max: issue.max });
}

function BlockText({ block }: { block: StartBlock | SendBlock }) {
    const { t } = useTranslation();
    if (block.kind === 'bodyNotAllowed') {
        return t('sendRequest.bodyNotAllowed', { method: block.method });
    }
    if (block.kind === 'noTarget') {
        return t('testConfig.blocked.noTarget');
    }
    if (block.kind === 'noServer') {
        return t('testConfig.blocked.noServer');
    }
    if (block.kind === 'noUrl') {
        return t('testConfig.blocked.noUrl');
    }
    if (block.kind === 'pathParam') {
        return t('testConfig.blocked.pathParam', { param: block.param });
    }
    if (block.kind === 'maskedSecret') {
        return t('testConfig.blocked.maskedSecret', { name: block.name });
    }
    if (block.kind === 'invalidBody') {
        return t('testConfig.blocked.invalidBody');
    }
    return t('testConfig.blocked.invalidConfig');
}

interface ConfigInputProps {
    label: string;
    unit?: string;
    srUnit?: string;
    value: number | null;
    issue: ConfigIssue | undefined;
    disabled: boolean;
    onChange: (value: number | null) => void;
}

function ConfigInput({ label, unit, srUnit, value, issue, disabled, onChange }: ConfigInputProps) {
    return (
        <Field.Root
            invalid={Boolean(issue)}
            disabled={disabled}
            className="w-fit"
        >
            <NumberField.Root
                value={value}
                onValueChange={onChange}
                disabled={disabled}
            >
                <NumberField.Group>
                    <NumberField.InlineLabel>
                        {label}
                        {srUnit ? <span className="sr-only">{srUnit}</span> : null}
                    </NumberField.InlineLabel>
                    <NumberField.Input />
                    {unit ? <NumberField.Suffix>{unit}</NumberField.Suffix> : null}
                </NumberField.Group>
            </NumberField.Root>
            {issue ? (
                <Field.Error match>
                    <IssueText issue={issue} />
                </Field.Error>
            ) : null}
        </Field.Root>
    );
}

export function TestConfigBar({
    config,
    onConfigChange,
    issues,
    block,
    phase,
    onStart,
    onStop,
    sendBlock = null,
    sending = false,
    onSend,
    onCancelSend,
    className,
}: TestConfigBarProps) {
    const { t, i18n } = useTranslation();
    const blockId = useId();
    const locked = phase !== 'idle';
    const setField = (field: ConfigField) => (value: number | null) =>
        onConfigChange({ ...config, [field]: value });
    const applyPreset = (preset: LoadPresetId) => onConfigChange({ ...LOAD_PRESETS[preset] });
    const { targetRps, durationSeconds, rampUpSeconds } = config;
    const estimate =
        Object.keys(issues).length === 0 && targetRps !== null && durationSeconds !== null
            ? estimateRequests({ targetRps, durationSeconds, rampUpSeconds: rampUpSeconds ?? 0 })
            : null;
    const idleBlock = phase === 'idle' ? block : null;
    const tooltipBlock = idleBlock?.kind === 'noTarget' ? idleBlock : null;
    const shownStartBlock =
        idleBlock && idleBlock.kind !== 'invalidConfig' && !tooltipBlock ? idleBlock : null;
    const sendOnlyBlock =
        phase === 'idle' && sendBlock?.kind === 'bodyNotAllowed' ? sendBlock : null;
    const showBlock = shownStartBlock ?? sendOnlyBlock;
    const showSend = Boolean(onSend) && phase === 'idle' && block?.kind !== 'noTarget';
    const sendButton = sending ? (
        <Button onClick={onCancelSend}>{t('sendRequest.cancel')}</Button>
    ) : (
        <Button
            disabled={Boolean(sendBlock)}
            aria-describedby={sendBlock && showBlock ? blockId : undefined}
            onClick={onSend}
        >
            {t('sendRequest.send')}
        </Button>
    );
    const startButton = (
        <Button
            variant="primary"
            className="font-bold"
            disabled={Boolean(block) || phase === 'starting'}
            aria-describedby={shownStartBlock || tooltipBlock ? blockId : undefined}
            onClick={onStart}
        >
            {phase === 'starting' ? t('testConfig.starting') : t('testConfig.start')}
        </Button>
    );

    return (
        <div className={cn('flex flex-col items-end gap-1.5', className)}>
            <div className="flex items-start gap-2">
                <PresetSelect
                    value={matchPreset(config)}
                    onSelect={applyPreset}
                    disabled={locked}
                />
                <ConfigInput
                    label={t('testConfig.targetRps')}
                    value={config.targetRps}
                    issue={issues.targetRps}
                    disabled={locked}
                    onChange={setField('targetRps')}
                />
                <ConfigInput
                    label={t('testConfig.duration')}
                    unit={t('testConfig.secondsUnit')}
                    srUnit={t('testConfig.inSeconds')}
                    value={config.durationSeconds}
                    issue={issues.durationSeconds}
                    disabled={locked}
                    onChange={setField('durationSeconds')}
                />
                <ConfigInput
                    label={t('testConfig.rampUp')}
                    unit={t('testConfig.secondsUnit')}
                    srUnit={t('testConfig.inSeconds')}
                    value={config.rampUpSeconds}
                    issue={issues.rampUpSeconds}
                    disabled={locked}
                    onChange={setField('rampUpSeconds')}
                />
                {showSend ? sendButton : null}
                {phase === 'running' || phase === 'stopping' ? (
                    <Button
                        variant="danger"
                        disabled={phase === 'stopping'}
                        onClick={onStop}
                    >
                        {phase === 'stopping' ? t('testConfig.stopping') : t('testConfig.stop')}
                    </Button>
                ) : tooltipBlock ? (
                    <Tooltip.Root>
                        <Tooltip.Trigger
                            render={<span className="inline-flex cursor-not-allowed" />}
                        >
                            {startButton}
                        </Tooltip.Trigger>
                        <Tooltip.Content aria-hidden>
                            <BlockText block={tooltipBlock} />
                        </Tooltip.Content>
                        <span
                            id={blockId}
                            className="sr-only"
                        >
                            <BlockText block={tooltipBlock} />
                        </span>
                    </Tooltip.Root>
                ) : (
                    startButton
                )}
            </div>
            {estimate === null ? null : (
                <p className="text-fg-muted text-label">
                    {t('testConfig.estimate', {
                        count: estimate,
                        formatted: formatNumber(estimate, 0, i18n.language),
                    })}
                </p>
            )}
            {showBlock ? (
                <p
                    id={blockId}
                    className="text-fg-muted text-label"
                >
                    <BlockText block={showBlock} />
                </p>
            ) : null}
        </div>
    );
}
