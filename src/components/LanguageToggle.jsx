import React from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

/**
 * LanguageToggle — segmented FR | EN control mounted in the Header
 * settings dropdown. Owns:
 *   1) i18next.changeLanguage (synchronous in our config)
 *   2) localStorage 'kaiyloLanguage' write
 *   3) Fire-and-forget supabase.auth.updateUser({ data: { language } })
 *
 * Does NOT mutate document.documentElement.lang directly — the
 * `languageChanged` listener installed in src/i18n/index.js owns that.
 * No toast (D8) and no UI loading state (D9 — optimistic write).
 */
const LANGUAGES = ['fr', 'en'];

const baseButtonStyle = {
  flex: 1,
  padding: '6px 10px',
  fontSize: '13px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  transition: 'background-color 0.2s, color 0.2s',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.55)',
};

const activeButtonStyle = {
  ...baseButtonStyle,
  background: 'rgba(212, 132, 90, 0.18)',
  color: '#d4845a',
};

const LanguageToggle = () => {
  const { t, i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'fr';

  const handleSelect = async (next) => {
    if (next === current) return; // no-op on active button
    await i18n.changeLanguage(next);
    try {
      localStorage.setItem('kaiyloLanguage', next);
    } catch (err) {
      // localStorage may be unavailable (e.g., private mode quota) —
      // not fatal, language still flipped in-session.
      console.warn('[i18n] localStorage write failed', err);
    }
    // Fire-and-forget Supabase write. Failures must NOT throw or
    // surface a toast (D8/D9). Log via console.warn for grepability.
    Promise.resolve(supabase.auth.updateUser({ data: { language: next } })).catch((err) => {
      console.warn('[i18n] language write-back failed', err);
    });
  };

  return (
    <div
      role="group"
      aria-label={t('settings.language_label')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        padding: '4px',
        marginBottom: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '8px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {LANGUAGES.map((lng) => {
        const isActive = lng === current;
        return (
          <button
            key={lng}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleSelect(lng)}
            style={isActive ? activeButtonStyle : baseButtonStyle}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {t(lng === 'fr' ? 'language.fr_label' : 'language.en_label')}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageToggle;
