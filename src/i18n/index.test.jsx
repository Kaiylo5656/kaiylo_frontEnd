import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for frontend/src/i18n/index.js
 *
 * Note: deviates from the plan in two ways and documents both:
 *   1) Filename is index.test.jsx (not .test.js) so vitest's include
 *      pattern `src/**\/*.test.jsx` picks it up.
 *   2) The production bootstrap registers a singleton i18next instance via
 *      `initReactI18next` (a side-effecting `use()` call), so once it is
 *      loaded in a test process every subsequent dynamic import sees the
 *      same singleton. To exercise the language-resolution branches
 *      independently we stub `localStorage` + `navigator.language` BEFORE
 *      the first import, reset modules, and re-import — then verify
 *      `i18next.language` reflects the resolution that ran at import time.
 *
 * The test/setup.js bootstrap also calls `initReactI18next` but only when
 * the singleton is not yet initialized. To keep each test independent we
 * reset modules and re-import; the singleton tracks the LAST `init()` call.
 */

const importFreshI18n = async () => {
  vi.resetModules();
  // Re-execute the production module which calls i18n.init synchronously.
  const mod = await import('./index.js');
  return mod.default;
};

describe('i18n/index.js — initial language resolution', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('resolves to "fr" when no cache and navigator.language is "fr-FR"', async () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    const i18n = await importFreshI18n();
    expect(i18n.language).toBe('fr');
    vi.unstubAllGlobals();
  });

  it('honors localStorage cache "en" even when navigator.language is "fr-FR"', async () => {
    localStorage.setItem('kaiyloLanguage', 'en');
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    const i18n = await importFreshI18n();
    expect(i18n.language).toBe('en');
    vi.unstubAllGlobals();
  });

  it('detects "en" from navigator.language "en-US" when no cache present', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const i18n = await importFreshI18n();
    expect(i18n.language).toBe('en');
    vi.unstubAllGlobals();
  });
});

describe('i18n/index.js — fallback + listener behavior', () => {
  it('falls through to the French value when a key is missing in EN', async () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    const i18n = await importFreshI18n();

    // settings.delete_account exists in both locales with different values
    await i18n.changeLanguage('en');
    expect(i18n.t('settings.delete_account')).toBe('Delete my account');

    // Force a key that exists ONLY in FR (we synthesize this scenario by
    // adding a temporary FR-only key, then deleting from EN if needed).
    i18n.addResource('fr', 'common', 'fr_only.greeting', 'Bonjour le monde');
    i18n.removeResourceBundle('en', 'commonFrOnly'); // no-op safety
    // Confirm the EN side genuinely lacks this key
    const enValue = i18n.getResource('en', 'common', 'fr_only.greeting');
    expect(enValue).toBeUndefined();

    // With EN active, missing-key must fall back to the FR string,
    // NOT the raw key and NOT a "[missing]" placeholder.
    const value = i18n.t('fr_only.greeting');
    expect(value).toBe('Bonjour le monde');
    expect(value).not.toBe('fr_only.greeting');
    expect(value).not.toMatch(/missing/i);
    vi.unstubAllGlobals();
  });

  it('registers a languageChanged listener that mirrors lang to <html>', async () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    const i18n = await importFreshI18n();

    // Reset the html lang to a sentinel
    document.documentElement.lang = 'xx';
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');

    await i18n.changeLanguage('fr');
    expect(document.documentElement.lang).toBe('fr');
    vi.unstubAllGlobals();
  });
});
