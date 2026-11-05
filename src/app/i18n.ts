import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from '@/locales/en/common.json';

export const defaultNS = 'common';
export const resources = { en: { common } } as const;

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
