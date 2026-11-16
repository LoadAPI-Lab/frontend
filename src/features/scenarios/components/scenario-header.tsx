import { MoreHorizontal, Play, Square, Trash2, Undo2, Workflow } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Menu } from '@/components/ui/menu';
import { cn } from '@/lib/cn';

import { MAX_NAME_LENGTH } from '../scenario-checks';
import type { ScenarioRunPhase } from '../use-scenario-run';

export interface ScenarioHeaderProps {
    name: string;
    onNameChange: (name: string) => void;
    nameRef?: Ref<HTMLInputElement>;
    nameInvalid: boolean;
    stepCount: number;
    variableCount: number;
    meta?: ReactNode;
    dirty: boolean;
    saved: boolean;
    saving: boolean;
    saveBlocked: boolean;
    phase: ScenarioRunPhase;
    blockedReason: string | null;
    onSave: () => void;
    onRun: () => void;
    onStop: () => void;
    onDiscard: () => void;
    onDelete: () => void;
}

export function ScenarioHeader({
    name,
    onNameChange,
    nameRef,
    nameInvalid,
    stepCount,
    variableCount,
    meta,
    dirty,
    saved,
    saving,
    saveBlocked,
    phase,
    blockedReason,
    onSave,
    onRun,
    onStop,
    onDiscard,
    onDelete,
}: ScenarioHeaderProps) {
    const { t } = useTranslation();
    const running = phase === 'running' || phase === 'stopping';

    return (
        <section
            aria-label={t('scenarios.header.label')}
            className="bg-surface-1 border-border rounded-card flex items-center gap-4 border px-4 py-3.5"
        >
            <span className="bg-accent text-accent-fg flex size-11 shrink-0 items-center justify-center rounded-lg">
                <Workflow
                    aria-hidden
                    className="size-5"
                />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                    ref={nameRef}
                    value={name}
                    maxLength={MAX_NAME_LENGTH}
                    aria-label={t('scenarios.header.name')}
                    aria-invalid={nameInvalid || undefined}
                    placeholder={t('scenarios.untitled')}
                    spellCheck={false}
                    className={cn(
                        'text-fg placeholder:text-fg-subtle -mx-1.5 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-lg font-semibold outline-none',
                        'hover:border-border-strong focus-visible:border-accent/60 focus-visible:bg-surface-input',
                        nameInvalid && 'border-danger/60',
                    )}
                    onChange={(event) => onNameChange(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">
                        {t('scenarios.header.steps', { count: stepCount })}
                    </Badge>
                    <Badge variant="outline">
                        {t('scenarios.header.variables', { count: variableCount })}
                    </Badge>
                    {dirty ? (
                        <Badge className="bg-warning/12 text-warning font-sans font-semibold">
                            {saved ? t('scenarios.header.unsaved') : t('scenarios.header.notSaved')}
                        </Badge>
                    ) : null}
                    {meta}
                </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                    {saved ? (
                        <Menu.Root>
                            <Menu.Trigger
                                render={
                                    <IconButton
                                        variant="ghost"
                                        size="md"
                                        aria-label={t('scenarios.header.more')}
                                    >
                                        <MoreHorizontal />
                                    </IconButton>
                                }
                            />
                            <Menu.Popup>
                                <Menu.Item
                                    disabled={!dirty}
                                    onClick={onDiscard}
                                >
                                    <Undo2 aria-hidden />
                                    {t('scenarios.header.discard')}
                                </Menu.Item>
                                <Menu.Separator />
                                <Menu.Item
                                    className="text-danger"
                                    disabled={running}
                                    onClick={onDelete}
                                >
                                    <Trash2 aria-hidden />
                                    {t('scenarios.header.delete')}
                                </Menu.Item>
                            </Menu.Popup>
                        </Menu.Root>
                    ) : null}
                    <Button
                        disabled={saving || saveBlocked || (saved && !dirty)}
                        onClick={onSave}
                    >
                        {saving ? t('scenarios.header.saving') : t('scenarios.header.save')}
                    </Button>
                    {running ? (
                        <Button
                            variant="danger"
                            disabled={phase === 'stopping'}
                            onClick={onStop}
                        >
                            <Square
                                aria-hidden
                                className="size-3 fill-current"
                            />
                            {phase === 'stopping'
                                ? t('scenarios.header.stopping')
                                : t('scenarios.header.stop')}
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            className="font-bold"
                            disabled={phase === 'starting' || blockedReason !== null}
                            aria-describedby={blockedReason ? 'scenario-blocked' : undefined}
                            onClick={onRun}
                        >
                            <Play
                                aria-hidden
                                className="size-3 fill-current"
                            />
                            {phase === 'starting'
                                ? t('scenarios.header.starting')
                                : t('scenarios.header.run')}
                        </Button>
                    )}
                </div>
                {blockedReason && !running ? (
                    <p
                        id="scenario-blocked"
                        className="text-fg-muted text-label"
                    >
                        {blockedReason}
                    </p>
                ) : null}
            </div>
        </section>
    );
}
