import { Link } from 'react-router-dom';

const LegalFooter = () => {
  return (
    <footer
      style={{
        width: '100%',
        padding: '16px 24px',
        textAlign: 'center',
        fontFamily: "'Inter', sans-serif",
        fontSize: '12px',
        fontWeight: 300,
        color: 'rgba(255,255,255,0.3)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px 12px',
        lineHeight: '1.6'
      }}
    >
      <span>© 2025 Kaiylo</span>
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
      <Link
        to="/mentions-legales"
        style={{
          color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none',
          transition: 'color 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(212,132,90,0.8)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
      >
        Mentions légales
      </Link>
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
      <Link
        to="/cgu"
        style={{
          color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none',
          transition: 'color 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(212,132,90,0.8)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
      >
        CGU
      </Link>
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
      <Link
        to="/politique-confidentialite"
        style={{
          color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none',
          transition: 'color 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(212,132,90,0.8)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
      >
        Politique de confidentialité
      </Link>
    </footer>
  );
};

export default LegalFooter;
