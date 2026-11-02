import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';

export function ScenariosPage() {
    const { t } = useTranslation();
    return (
        <PageHeader
            title={t('scenarios.title')}
            description={t('app.comingSoon')}
        />
    );
}
