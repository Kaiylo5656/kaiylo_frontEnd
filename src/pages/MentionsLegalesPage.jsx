import { useNavigate } from 'react-router-dom';

const MentionsLegalesPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen text-white antialiased relative"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
          backgroundColor: '#0a0a0a'
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(100px)',
          backgroundColor: 'rgba(0,0,0,0.01)',
          zIndex: 6,
          pointerEvents: 'none'
        }}
      />
      {/* Conic gradient left */}
      <div
        style={{
          position: 'absolute',
          top: '-25px',
          left: 0,
          transform: 'translateY(-50%)',
          width: '50vw',
          height: '900px',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255,255,255,0.95) 5deg, rgba(255,255,255,0.9) 10deg,rgb(35,38,49) 23.5deg, rgba(0,0,0,0.51) 105deg, rgba(18,2,10,0.18) 281deg, rgba(9,0,4,0.04) 330deg, rgba(35,70,193,0.15) 340deg, rgba(35,70,193,0.08) 350deg, rgba(35,70,193,0.03) 355deg, rgba(0,0,0,0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          filter: 'brightness(1.5)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 1.0,
          animation: 'organicGradientBright 15s ease-in-out infinite'
        }}
      />
      {/* Conic gradient right */}
      <div
        style={{
          position: 'absolute',
          top: '-25px',
          left: '50vw',
          transform: 'translateY(-50%) scaleX(-1)',
          width: '50vw',
          height: '900px',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255,255,255,0.95) 5deg, rgba(255,255,255,0.9) 10deg,rgb(35,38,49) 23.5deg, rgba(0,0,0,0.51) 105deg, rgba(18,2,10,0.18) 281deg, rgba(9,0,4,0.04) 330deg, rgba(35,70,193,0.15) 340deg, rgba(35,70,193,0.08) 350deg, rgba(35,70,193,0.03) 355deg, rgba(0,0,0,0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          filter: 'brightness(1.5)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 1.0,
          animation: 'organicGradientBright 15s ease-in-out infinite 1.5s'
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(212,132,90,1)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 300,
            marginBottom: '40px',
            padding: 0
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 200,
            color: 'rgba(255,255,255,1)',
            marginBottom: '48px',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          Mentions Légales
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <Section title="Éditeur du site">
            <p style={textStyle}>
              <strong style={labelStyle}>Raison sociale :</strong> Kaiylo — [NOM DE L'ASSOCIÉ], auto-entrepreneur
            </p>
            <p style={textStyle}>
              <strong style={labelStyle}>SIRET :</strong> [SIRET]
            </p>
            <p style={textStyle}>
              <strong style={labelStyle}>Adresse :</strong> [ADRESSE]
            </p>
            <p style={textStyle}>
              <strong style={labelStyle}>Email :</strong>{' '}
              <a href="mailto:[EMAIL CONTACT]" style={linkStyle}>[EMAIL CONTACT]</a>
            </p>
            <p style={textStyle}>
              <strong style={labelStyle}>Directeur de publication :</strong> [NOM DE L'ASSOCIÉ]
            </p>
          </Section>

          <Section title="Hébergement">
            <p style={textStyle}>
              <strong style={labelStyle}>Frontend :</strong><br />
              Vercel Inc.<br />
              340 Pine Street, San Francisco, CA 94104, États-Unis<br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>vercel.com</a>
            </p>
            <p style={textStyle} className="mt-4">
              <strong style={labelStyle}>Backend :</strong><br />
              Railway Corp.<br />
              340 Pine Street Suite 1900, San Francisco, CA 94104, États-Unis<br />
              <a href="https://railway.app" target="_blank" rel="noopener noreferrer" style={linkStyle}>railway.app</a>
            </p>
          </Section>

          <Section title="Propriété intellectuelle">
            <p style={textStyle}>
              © Kaiylo 2025. Tous droits réservés.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              L'ensemble du contenu de ce site (textes, images, logos, logiciels) est la propriété exclusive de Kaiylo ou de ses auteurs, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, modification, publication, transmission ou dénaturation, totale ou partielle, du contenu de ce site est interdite sans l'autorisation préalable écrite de Kaiylo.
            </p>
          </Section>

          <Section title="Données personnelles">
            <p style={textStyle}>
              Pour toute information relative au traitement de vos données personnelles, veuillez consulter notre{' '}
              <a href="/politique-confidentialite" style={linkStyle}>Politique de confidentialité</a>.
            </p>
          </Section>

          <Section title="Droit applicable">
            <p style={textStyle}>
              Le présent site est soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div>
    <h2
      style={{
        fontSize: '16px',
        fontWeight: 400,
        color: 'rgba(212,132,90,1)',
        marginBottom: '16px',
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.02em'
      }}
    >
      {title}
    </h2>
    <div
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px 24px'
      }}
    >
      {children}
    </div>
  </div>
);

const textStyle = {
  fontSize: '14px',
  fontWeight: 300,
  color: 'rgba(255,255,255,0.75)',
  lineHeight: '1.7',
  fontFamily: "'Inter', sans-serif"
};

const labelStyle = {
  color: 'rgba(255,255,255,0.9)',
  fontWeight: 400
};

const linkStyle = {
  color: 'rgba(212,132,90,1)',
  textDecoration: 'none'
};

export default MentionsLegalesPage;
