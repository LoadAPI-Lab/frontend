import { useQuery } from '@tanstack/react-query';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UploadIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { apiSpecsQuery, openImportDialog } from '@/features/collections';

export interface NoEndpointCardProps {
    hasCollections: boolean;
    onImport: () => void;
}

export function NoEndpointCard({ hasCollections, onImport }: NoEndpointCardProps) {
    const { t } = useTranslation();
    return (
        <Card aria-label={t('stressTests.noEndpoint.label')}>
            {hasCollections ? (
                <EmptyState
                    icon={<PanelLeft />}
                    title={t('stressTests.noEndpoint.pick.title')}
                    description={t('stressTests.noEndpoint.pick.body')}
                />
            ) : (
                <EmptyState
                    icon={<UploadIcon />}
                    title={t('stressTests.noEndpoint.import.title')}
                    description={t('stressTests.noEndpoint.import.body')}
                    action={
                        <Button
                            variant="primary"
                            onClick={onImport}
                        >
                            {t('collections.importShort')}
                        </Button>
                    }
                />
            )}
        </Card>
    );
}

export function NoEndpoint() {
    const specs = useQuery(apiSpecsQuery);
    if (specs.isPending) {
        return <Skeleton className="h-60" />;
    }
    return (
        <NoEndpointCard
            hasCollections={specs.isError || specs.data.length > 0}
            onImport={openImportDialog}
        />
    );
}
