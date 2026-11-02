import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

// TODO(collections): tree from the collections API, OpenAPI import dialog.
export function CollectionsSidebar() {
    const { t } = useTranslation();
    return (
        <div className="flex h-full flex-col p-3">
            <h2 className="text-fg-muted px-2 pb-3 text-xs font-semibold tracking-wider uppercase">
                {t('collections.title')}
            </h2>
            <p className="text-fg-muted flex-1 px-2 text-sm">{t('collections.empty')}</p>
            <Button
                variant="ghost"
                className="border-border mt-3 w-full border border-dashed"
            >
                <Upload
                    aria-hidden
                    className="size-4"
                />
                {t('collections.import')}
            </Button>
        </div>
    );
}
