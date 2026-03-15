import { useNavigate } from 'react-router-dom';

const CGUPage = () => {
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

        <h1 style={{ fontSize: '32px', fontWeight: 200, color: 'rgba(255,255,255,1)', marginBottom: '12px', fontFamily: "'Inter', sans-serif" }}>
          Conditions Générales d'Utilisation
        </h1>
        <p style={{ ...textStyle, marginBottom: '48px' }}>
          Dernière mise à jour : 2025
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <Section title="1. Objet et accès à la plateforme">
            <p style={textStyle}>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Kaiylo, accessible à l'adresse <a href="https://kaiylo.fr" style={linkStyle}>kaiylo.fr</a>, éditée par [NOM DE L'ASSOCIÉ], auto-entrepreneur.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              L'accès à la plateforme est réservé aux utilisateurs majeurs disposant d'un compte valide. Kaiylo est une plateforme SaaS dédiée au coaching en Streetlifting et Powerlifting, permettant aux coachs de gérer leurs élèves et aux élèves de suivre leurs programmes d'entraînement.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              Tout accès à la plateforme implique l'acceptation sans réserve des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
            </p>
          </Section>

          <Section title="2. Rôles et règles d'usage">
            <p style={textStyle}>
              <strong style={labelStyle}>Coach :</strong> Le coach dispose d'un accès complet à la gestion de ses élèves, à la création de programmes d'entraînement, au suivi des progressions et à la communication via messagerie intégrée. Le coach s'engage à utiliser la plateforme dans le respect des règles applicables et à ne pas diffuser de contenus illicites.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              <strong style={labelStyle}>Élève (Student) :</strong> L'élève accède à la plateforme uniquement via une invitation de son coach. Il peut consulter ses programmes, enregistrer ses séances et communiquer avec son coach. L'élève s'engage à utiliser la plateforme conformément aux indications de son coach.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              Tout comportement abusif, frauduleux ou contraire aux présentes CGU peut entraîner la suspension immédiate du compte.
            </p>
          </Section>

          <Section title="3. Contenu utilisateur et droits concédés">
            <p style={textStyle}>
              Les utilisateurs peuvent déposer des vidéos, messages, données de séances et autres contenus sur la plateforme. En déposant un contenu, l'utilisateur accorde à Kaiylo une licence non exclusive, mondiale et gratuite d'hébergement, de stockage et d'affichage de ce contenu, dans le seul but de fournir le service.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              L'utilisateur conserve l'intégralité de ses droits sur les contenus qu'il dépose. Kaiylo ne revendique aucun droit de propriété sur ces contenus et ne les utilise pas à des fins commerciales.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              Il est interdit de déposer des contenus illicites, offensants, portant atteinte aux droits de tiers ou contenant des logiciels malveillants.
            </p>
          </Section>

          <Section title="4. Obligations des parties">
            <p style={textStyle}>
              <strong style={labelStyle}>Kaiylo s'engage à :</strong>
            </p>
            <ul style={{ ...textStyle, marginTop: '8px', paddingLeft: '20px', listStyle: 'disc' }}>
              <li>Assurer la disponibilité du service dans la mesure du possible</li>
              <li>Protéger les données personnelles des utilisateurs conformément au RGPD</li>
              <li>Informer les utilisateurs de toute modification significative des CGU</li>
            </ul>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              <strong style={labelStyle}>L'utilisateur s'engage à :</strong>
            </p>
            <ul style={{ ...textStyle, marginTop: '8px', paddingLeft: '20px', listStyle: 'disc' }}>
              <li>Maintenir la confidentialité de ses identifiants de connexion</li>
              <li>Ne pas tenter d'accéder aux comptes d'autres utilisateurs</li>
              <li>Ne pas utiliser la plateforme à des fins illicites</li>
              <li>Signaler tout usage frauduleux à Kaiylo</li>
            </ul>
          </Section>

          <Section title="5. Suspension et résiliation de compte">
            <p style={textStyle}>
              Kaiylo se réserve le droit de suspendre ou de supprimer tout compte en cas de violation des présentes CGU, sans préavis ni indemnité.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              L'utilisateur peut demander la suppression de son compte à tout moment en contactant Kaiylo à l'adresse <a href="mailto:[EMAIL CONTACT]" style={linkStyle}>[EMAIL CONTACT]</a> ou directement depuis la plateforme. La suppression entraîne la perte définitive de toutes les données associées au compte dans un délai de 30 jours.
            </p>
          </Section>

          <Section title="6. Responsabilité limitée">
            <p style={textStyle}>
              Kaiylo s'efforce d'assurer la continuité du service mais ne peut garantir une disponibilité ininterrompue. Kaiylo ne saurait être tenu responsable des dommages indirects résultant de l'utilisation ou de l'impossibilité d'utiliser la plateforme.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              La responsabilité de Kaiylo est limitée aux seuls dommages directs prouvés, et plafonnée au montant des sommes versées par l'utilisateur au cours des 12 derniers mois.
            </p>
          </Section>

          <Section title="7. Droit applicable">
            <p style={textStyle}>
              Les présentes CGU sont soumises au droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes, les parties s'efforceront de régler leur différend à l'amiable. À défaut, le tribunal compétent en France sera seul compétent.
            </p>
          </Section>

          <Section title="8. Modification des CGU">
            <p style={textStyle}>
              Kaiylo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification significative. La poursuite de l'utilisation de la plateforme après notification vaut acceptation des nouvelles CGU.
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

export default CGUPage;
