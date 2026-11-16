import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/dialog';

import { type ScenarioSummary, useDeleteScenario } from '../scenario-api';

export interface DeleteScenarioDialogProps {
    scenario: ScenarioSummary | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: (scenario: ScenarioSummary) => void;
}

export function DeleteScenarioDialog({
    scenario,
    open,
    onOpenChange,
    onDeleted,
}: DeleteScenarioDialogProps) {
    const { t } = useTranslation();
    const remove = useDeleteScenario((deleted) => {
        onOpenChange(false);
        onDeleted(deleted);
    });

    return (
        <AlertDialog.Root
            open={open && scenario !== null}
            onOpenChange={(next) => {
                if (!remove.isPending) {
                    onOpenChange(next);
                }
            }}
            onOpenChangeComplete={(isOpen) => {
                if (!isOpen) {
                    remove.reset();
                }
            }}
        >
            <AlertDialog.Popup>
                <AlertDialog.Title>
                    {t('scenarios.delete.title', { name: scenario?.name ?? '' })}
                </AlertDialog.Title>
                <AlertDialog.Description>
                    {t('scenarios.delete.body', { count: scenario?.stepsCount ?? 0 })}
                </AlertDialog.Description>
                <AlertDialog.Footer>
                    <AlertDialog.Close
                        disabled={remove.isPending}
                        render={<Button variant="ghost">{t('scenarios.delete.cancel')}</Button>}
                    />
                    <Button
                        variant="danger"
                        disabled={remove.isPending}
                        onClick={() => {
                            if (scenario) {
                                remove.mutate(scenario);
                            }
                        }}
                    >
                        {remove.isPending
                            ? t('scenarios.delete.deleting')
                            : t('scenarios.delete.confirm')}
                    </Button>
                </AlertDialog.Footer>
            </AlertDialog.Popup>
        </AlertDialog.Root>
    );
}
