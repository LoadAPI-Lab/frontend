import { useTranslation } from 'react-i18next';

import { Card, CardTitle } from '@/components/ui/card';

import type { ScenarioVariable } from '../scenario-checks';

export interface VariablesCardProps {
    variables: ScenarioVariable[];
    undefinedNames: string[];
}

const stepLabel = (step: number) => String(step).padStart(2, '0');

export function VariablesCard({ variables, undefinedNames }: VariablesCardProps) {
    const { t } = useTranslation();
    const empty = variables.length === 0 && undefinedNames.length === 0;

    return (
        <Card
            aria-labelledby="scenario-variables"
            className="flex flex-col gap-2"
        >
            <CardTitle
                id="scenario-variables"
                className="text-md"
            >
                {t('scenarios.variables.title')}
            </CardTitle>
            {empty ? (
                <p className="text-fg-muted text-base">{t('scenarios.variables.empty')}</p>
            ) : (
                <table className="w-full table-fixed text-left">
                    <thead>
                        <tr className="text-fg-muted tracking-label text-2xs uppercase">
                            <th className="w-[38%] pb-1.5 font-semibold">
                                {t('scenarios.variables.name')}
                            </th>
                            <th className="pb-1.5 font-semibold">
                                {t('scenarios.variables.path')}
                            </th>
                            <th className="w-14 pb-1.5 text-right font-semibold">
                                {t('scenarios.variables.step')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-border divide-y font-mono text-base">
                        {variables.map((variable) => (
                            <tr key={`${variable.step}-${variable.name}`}>
                                <td className="text-accent truncate py-1.5 pr-2 font-bold">
                                    {variable.name}
                                </td>
                                <td className="text-fg-secondary truncate py-1.5 pr-2">
                                    {variable.path || '…'}
                                </td>
                                <td className="text-fg-muted py-1.5 text-right tabular-nums">
                                    {stepLabel(variable.step)}
                                </td>
                            </tr>
                        ))}
                        {undefinedNames.map((name) => (
                            <tr key={`undefined-${name}`}>
                                <td className="text-danger truncate py-1.5 pr-2 font-bold">
                                    {name}
                                </td>
                                <td
                                    colSpan={2}
                                    className="text-danger py-1.5 font-sans"
                                >
                                    {t('scenarios.variables.notExtracted')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {variables.some((variable) => variable.usedBy.length === 0) ? (
                <p className="text-fg-muted text-base">
                    {t('scenarios.variables.unused', {
                        names: variables
                            .filter((variable) => variable.usedBy.length === 0)
                            .map((variable) => variable.name)
                            .join(', '),
                    })}
                </p>
            ) : null}
        </Card>
    );
}
