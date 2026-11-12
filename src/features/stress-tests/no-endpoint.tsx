import { useQuery } from '@tanstack/react-query';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusIcon, UploadIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { apiSpecsQuery, openImportDialog } from '@/features/collections';

export interface NoEndpointCardProps {
    hasCollections: boolean;
    onImport: () => void;
    onNewRequest?: () => void;
}

export function NoEndpointCard({ hasCollections, onImport, onNewRequest }: NoEndpointCardProps) {
    const { t } = useTranslation();
    const newRequest = onNewRequest ? (
        <Button
            variant={hasCollections ? 'primary' : 'secondary'}
            onClick={onNewRequest}
        >
            <PlusIcon aria-hidden />
            {t('collections.newRequest')}
        </Button>
    ) : null;
    return (
        <Card aria-label={t('stressTests.noEndpoint.label')}>
            {hasCollections ? (
                <EmptyState
                    icon={<PanelLeft />}
                    title={t('stressTests.noEndpoint.pick.title')}
                    description={
                        <>
                            {t('stressTests.noEndpoint.pick.body')}
                            {onNewRequest ? ` ${t('stressTests.noEndpoint.orNew')}` : null}
                        </>
                    }
                    action={newRequest}
                />
            ) : (
                <EmptyState
                    icon={<UploadIcon />}
                    title={t('stressTests.noEndpoint.import.title')}
                    description={t('stressTests.noEndpoint.import.body')}
                    action={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="primary"
                                onClick={onImport}
                            >
                                {t('collections.importShort')}
                            </Button>
                            {newRequest}
                        </div>
                    }
                />
            )}
        </Card>
    );
}

export interface NoEndpointProps {
    onNewRequest?: () => void;
}

export function NoEndpoint({ onNewRequest }: NoEndpointProps) {
    const specs = useQuery(apiSpecsQuery);
    if (specs.isPending) {
        return <Skeleton className="h-60" />;
    }
    return (
        <NoEndpointCard
            hasCollections={specs.isError || specs.data.length > 0}
            onImport={openImportDialog}
            onNewRequest={onNewRequest}
        />
    );
}
