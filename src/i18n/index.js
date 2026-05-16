import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import commonFR from './locales/fr/common.json';
import commonEN from './locales/en/common.json';

const cached = localStorage.getItem('kaiyloLanguage');
const detected = navigator.language?.startsWith('en') ? 'en' : 'fr';
const initialLng = (cached === 'fr' || cached === 'en') ? cached : detected;

i18n
  .use(resourcesToBackend((lng, ns) => import(`./locales/${lng}/${ns}.json`)))
  .use(initReactI18next)
  .init({
    lng: initialLng,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    defaultNS: 'common',
    ns: ['common'],
    resources: {
      fr: { common: commonFR },
      en: { common: commonEN },
    },
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (lngs, ns, key) => console.warn(`[i18n] missing ${lngs[0]}:${ns}:${key}`)
      : undefined,
    initImmediate: false,
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

export default i18n;
