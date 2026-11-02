import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from '@/locales/en/common.json';

export const defaultNS = 'common';
export const resources = { en: { common } } as const;

// All user-facing text goes through t(). English only for now; add locales under src/locales/<lng>/.
// own instance; initReactI18next registers it for useTranslation()
export const i18n = createInstance();

void i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: [defaultNS],
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
});
