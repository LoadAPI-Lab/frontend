import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { NumberField } from '@/components/ui/number-field';
import { cn } from '@/lib/cn';

import type { ConfigField, ConfigIssue, ConfigIssues, TestConfig } from './test-config';
import type { RunPhase, StartBlock } from './use-test-run-controls';

export interface TestConfigBarProps {
    config: TestConfig;
    onConfigChange: (config: TestConfig) => void;
    issues: ConfigIssues;
    block: StartBlock | null;
    phase: RunPhase;
    onStart: () => void;
    onStop: () => void;
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

function BlockText({ block }: { block: StartBlock }) {
    const { t } = useTranslation();
    if (block.kind === 'noTarget') {
        return t('testConfig.blocked.noTarget');
    }
    if (block.kind === 'noServer') {
        return t('testConfig.blocked.noServer');
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
    className,
}: TestConfigBarProps) {
    const { t } = useTranslation();
    const blockId = useId();
    const locked = phase !== 'idle';
    const setField = (field: ConfigField) => (value: number | null) =>
        onConfigChange({ ...config, [field]: value });
    const showBlock = block && block.kind !== 'invalidConfig' && phase === 'idle';

    return (
        <div className={cn('flex flex-col items-end gap-1.5', className)}>
            <div className="flex items-start gap-2">
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
                {phase === 'running' || phase === 'stopping' ? (
                    <Button
                        variant="danger"
                        disabled={phase === 'stopping'}
                        onClick={onStop}
                    >
                        {phase === 'stopping' ? t('testConfig.stopping') : t('testConfig.stop')}
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        className="font-bold"
                        disabled={Boolean(block) || phase === 'starting'}
                        aria-describedby={showBlock ? blockId : undefined}
                        onClick={onStart}
                    >
                        {phase === 'starting' ? t('testConfig.starting') : t('testConfig.start')}
                    </Button>
                )}
            </div>
            {showBlock ? (
                <p
                    id={blockId}
                    className="text-fg-muted text-label"
                >
                    <BlockText block={block} />
                </p>
            ) : null}
        </div>
    );
}
