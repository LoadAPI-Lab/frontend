import { useTranslation } from 'react-i18next';

import { isKnownStatusCode } from '@/lib/http-status';

export function useStatusLabel() {
    const { t } = useTranslation();
    return (code: string) =>
        isKnownStatusCode(code)
            ? t('httpStatus.withReason', { code, reason: t(`httpStatus.reasons.${code}`) })
            : code;
}
