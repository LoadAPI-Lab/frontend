import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { ApiSpecSummary } from './api';
import { MAX_SPEC_NAME, useRenameSpec } from './import-spec';

export interface RenameSpecDialogProps {
    spec: ApiSpecSummary;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRenamed: (spec: ApiSpecSummary) => void;
}

export function RenameSpecDialog({ spec, open, onOpenChange, onRenamed }: RenameSpecDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState(spec.name);
    const rename = useRenameSpec((renamed) => {
        onOpenChange(false);
        onRenamed(renamed);
    });
    const trimmed = name.trim();
    const tooLong = trimmed.length > MAX_SPEC_NAME;
    const unchanged = trimmed === '' || trimmed === spec.name;

    return (
        <Dialog.Root
            open={open}
            onOpenChange={onOpenChange}
        >
            <Dialog.Popup className="w-[440px]">
                <Dialog.Title>{t('collections.rename.title', { name: spec.name })}</Dialog.Title>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!tooLong && !unchanged) {
                            rename.mutate({ id: spec.id, name: trimmed });
                        }
                    }}
                >
                    <Field.Root invalid={tooLong}>
                        <Field.Label>{t('collections.rename.label')}</Field.Label>
                        <Input
                            value={name}
                            onValueChange={(value) => setName(value)}
                            onFocus={(event) => event.currentTarget.select()}
                        />
                        {tooLong ? (
                            <Field.Error
                                match
                                className="text-base"
                            >
                                {t('collections.rename.tooLong', { max: MAX_SPEC_NAME })}
                            </Field.Error>
                        ) : null}
                    </Field.Root>
                    <Dialog.Footer>
                        <Dialog.Close
                            render={
                                <Button variant="ghost">{t('collections.rename.cancel')}</Button>
                            }
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            className="font-bold"
                            disabled={tooLong || unchanged || rename.isPending}
                        >
                            {rename.isPending
                                ? t('collections.rename.saving')
                                : t('collections.rename.submit')}
                        </Button>
                    </Dialog.Footer>
                </form>
            </Dialog.Popup>
        </Dialog.Root>
    );
}
