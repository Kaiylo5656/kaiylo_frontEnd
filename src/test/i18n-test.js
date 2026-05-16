// Test-only i18next bootstrap. Registers a default i18next instance synchronously
// with the namespaces touched by Phase 9 critical-path tests. All non-common
// namespaces start empty — tests assert against `common` keys and rely on the
// FR fallback chain for the rest.
//
// Mirrors the production config (useSuspense: false, fallbackLng: 'fr') and
// installs the same `languageChanged → document.documentElement.lang` listener
// so component tests faithfully exercise the production behavior.
//
// This file is imported by src/test/setup.js. It must NEVER be imported from
// production code.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const commonFR = {
  settings: {
    language_label: 'Langue / Language',
    delete_account: 'Supprimer mon compte',
  },
  language: {
    fr_label: 'FR',
    en_label: 'EN',
  },
  buttons: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    delete: 'Supprimer',
  },
};

const commonEN = {
  settings: {
    language_label: 'Langue / Language',
    delete_account: 'Delete my account',
  },
  language: {
    fr_label: 'FR',
    en_label: 'EN',
  },
  buttons: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    delete: 'Delete',
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'fr',
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'onboarding', 'dashboard', 'workout', 'landing'],
    resources: {
      fr: {
        common: commonFR,
        auth: {},
        onboarding: {},
        dashboard: {},
        workout: {},
        landing: {},
      },
      en: {
        common: commonEN,
        auth: {},
        onboarding: {},
        dashboard: {},
        workout: {},
        landing: {},
      },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    initImmediate: false,
  });

  // Mirror production listener so component tests can assert <html lang> behavior.
  i18n.on('languageChanged', (lng) => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = lng;
    }
  });
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = i18n.language;
  }
}

export default i18n;
