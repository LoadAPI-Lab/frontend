import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';

export function HistoryPage() {
    const { t } = useTranslation();
    return (
        <PageHeader
            title={t('history.title')}
            description={t('app.comingSoon')}
        />
    );
}
