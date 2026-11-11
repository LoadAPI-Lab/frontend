import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/dialog';

import type { ApiSpecSummary } from './api';
import { useDeleteSpec } from './import-spec';

export interface DeleteSpecDialogProps {
    spec: ApiSpecSummary | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: (spec: ApiSpecSummary) => void;
}

export function DeleteSpecDialog({ spec, open, onOpenChange, onDeleted }: DeleteSpecDialogProps) {
    const { t } = useTranslation();
    const deleteSpec = useDeleteSpec((deleted) => {
        onOpenChange(false);
        onDeleted(deleted);
    });

    return (
        <AlertDialog.Root
            open={open && spec !== null}
            onOpenChange={(next) => {
                if (!deleteSpec.isPending) {
                    onOpenChange(next);
                }
            }}
            onOpenChangeComplete={(isOpen) => {
                if (!isOpen) {
                    deleteSpec.reset();
                }
            }}
        >
            <AlertDialog.Popup>
                <AlertDialog.Title>
                    {t('collections.delete.title', { name: spec?.name ?? '' })}
                </AlertDialog.Title>
                <AlertDialog.Description>
                    {t('collections.delete.body', { count: spec?.endpointsCount ?? 0 })}
                </AlertDialog.Description>
                <AlertDialog.Footer>
                    <AlertDialog.Close
                        disabled={deleteSpec.isPending}
                        render={<Button variant="ghost">{t('collections.delete.cancel')}</Button>}
                    />
                    <Button
                        variant="danger"
                        disabled={deleteSpec.isPending}
                        onClick={() => {
                            if (spec) {
                                deleteSpec.mutate(spec);
                            }
                        }}
                    >
                        {deleteSpec.isPending
                            ? t('collections.delete.deleting')
                            : t('collections.delete.confirm')}
                    </Button>
                </AlertDialog.Footer>
            </AlertDialog.Popup>
        </AlertDialog.Root>
    );
}
