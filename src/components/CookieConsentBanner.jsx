import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'kaiylo_cookie_consent';

const CookieConsentBanner = ({ onAccept }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    if (onAccept) {
      onAccept();
    }
  };

  const handleRefuse = () => {
    localStorage.setItem(CONSENT_KEY, 'refused');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15,15,15,0.97)',
        borderTop: '0.5px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <p
        style={{
          flex: '1 1 300px',
          fontSize: '13px',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: '1.6',
          margin: 0
        }}
      >
        Kaiylo utilise des cookies techniques nécessaires au fonctionnement du service ainsi que des outils de monitoring des erreurs (Sentry).{' '}
        <Link
          to="/politique-confidentialite"
          style={{ color: 'rgba(212,132,90,0.9)', textDecoration: 'none' }}
        >
          En savoir plus
        </Link>
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={handleRefuse}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.5)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
        >
          Refuser
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 400,
            color: 'rgba(255,255,255,1)',
            backgroundColor: 'rgba(212,132,90,1)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(191,115,72,1)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(212,132,90,1)'; }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
