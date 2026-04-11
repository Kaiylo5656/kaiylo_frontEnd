import { useNavigate } from 'react-router-dom';

const PolitiqueConfidentialitePage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen text-white antialiased relative"
      style={{ backgroundColor: '#0a0a0a' }}
    >
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
      {/* Conic gradient right */}
      <div
        style={{
          position: 'fixed',
          top: '-175px',
          left: 0,
          transform: 'translateY(-50%)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite'
        }}
      />
      {/* Conic gradient left */}
      <div
        style={{
          position: 'fixed',
          top: '-175px',
          left: '50vw',
          transform: 'translateY(-50%) scaleX(-1)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite 1.5s'
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
          Politique de Confidentialité
        </h1>
        <p style={{ ...textStyle, marginBottom: '48px' }}>
          Dernière mise à jour : 2025 — Conformément au Règlement Général sur la Protection des Données (RGPD)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <Section title="1. Responsable de traitement">
            <p style={textStyle}>
              Le responsable du traitement des données personnelles collectées via la plateforme Kaiylo est :<br /><br />
              <strong style={labelStyle}>Théo Kai Leng CHOMARAT</strong><br />
              Auto-entrepreneur — SIRET : 91902856300014<br />
              Adresse : [ADRESSE]<br />
              Email : <a href="mailto:contact@kaiylo.fr" style={linkStyle}>contact@kaiylo.fr</a>
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p style={textStyle}>
              Dans le cadre de l'utilisation de la plateforme Kaiylo, nous collectons les données suivantes :
            </p>
            <ul style={{ ...textStyle, marginTop: '12px', paddingLeft: '20px', listStyle: 'disc' }}>
              <li><strong style={labelStyle}>Données d'identification :</strong> nom, prénom, adresse email</li>
              <li><strong style={labelStyle}>Données sportives :</strong> records personnels (1RM), sessions d'entraînement, progressions</li>
              <li><strong style={labelStyle}>Contenus utilisateurs :</strong> vidéos d'entraînement, messages de chat</li>
              <li><strong style={labelStyle}>Données de profil :</strong> genre, date de naissance, taille, poids, discipline sportive</li>
              <li><strong style={labelStyle}>Données de connexion :</strong> adresse IP, logs de connexion (gérés par Supabase)</li>
            </ul>
          </Section>

          <Section title="3. Finalités et base légale">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Finalité</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Fourniture du service de coaching</td>
                  <td style={tdStyle}>Exécution du contrat</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Gestion des programmes et du suivi sportif</td>
                  <td style={tdStyle}>Exécution du contrat</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Communication entre coach et élève</td>
                  <td style={tdStyle}>Exécution du contrat</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Amélioration du service, monitoring des erreurs</td>
                  <td style={tdStyle}>Intérêt légitime</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Envoi d'emails transactionnels (bienvenue, notifications)</td>
                  <td style={tdStyle}>Exécution du contrat</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="4. Sous-traitants">
            <p style={textStyle}>
              Kaiylo fait appel aux sous-traitants suivants pour assurer le service :
            </p>
            <ul style={{ ...textStyle, marginTop: '12px', paddingLeft: '20px', listStyle: 'disc' }}>
              <li>
                <strong style={labelStyle}>Supabase</strong> (USA/UE) — Hébergement de la base de données et des fichiers (vidéos). Politique de confidentialité : <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>supabase.com/privacy</a>
              </li>
              <li style={{ marginTop: '8px' }}>
                <strong style={labelStyle}>Stripe</strong> (USA) — Traitement des paiements. Politique : <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>stripe.com/fr/privacy</a>
              </li>
              <li style={{ marginTop: '8px' }}>
                <strong style={labelStyle}>Sentry</strong> (USA) — Monitoring des erreurs applicatives. Politique : <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" style={linkStyle}>sentry.io/privacy</a>
              </li>
              <li style={{ marginTop: '8px' }}>
                <strong style={labelStyle}>Resend</strong> (USA) — Envoi d'emails transactionnels. Politique : <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>resend.com/privacy</a>
              </li>
              <li style={{ marginTop: '8px' }}>
                <strong style={labelStyle}>Notion</strong> (USA) — Base de données pour les retours utilisateurs et la liste d'attente. Politique : <a href="https://www.notion.so/fr/privacy-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>notion.so/privacy</a>
              </li>
            </ul>
            <p style={{ ...textStyle, marginTop: '16px' }}>
              Ces prestataires situés hors de l'UE traitent les données dans le cadre de garanties appropriées (clauses contractuelles types ou Privacy Shield successor). Nous veillons à ce qu'ils respectent des niveaux de protection adéquats.
            </p>
          </Section>

          <Section title="5. Durée de conservation">
            <p style={textStyle}>
              Vos données sont conservées pendant toute la durée d'activité de votre compte. En cas de résiliation ou de suppression de compte, l'ensemble des données personnelles est supprimé dans un délai de <strong style={labelStyle}>30 jours</strong>.
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              Certaines données peuvent être conservées plus longtemps si la loi l'exige (par exemple, données comptables et financières pendant 10 ans).
            </p>
          </Section>

          <Section title="6. Vos droits RGPD">
            <p style={textStyle}>
              Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
            </p>
            <ul style={{ ...textStyle, marginTop: '12px', paddingLeft: '20px', listStyle: 'disc' }}>
              <li><strong style={labelStyle}>Droit d'accès :</strong> obtenir une copie de vos données</li>
              <li><strong style={labelStyle}>Droit de rectification :</strong> corriger des données inexactes</li>
              <li><strong style={labelStyle}>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong style={labelStyle}>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong style={labelStyle}>Droit d'opposition :</strong> vous opposer à certains traitements</li>
              <li><strong style={labelStyle}>Droit à la limitation :</strong> demander la limitation du traitement</li>
            </ul>
            <p style={{ ...textStyle, marginTop: '16px' }}>
              Pour exercer vos droits, contactez-nous à : <a href="mailto:contact@kaiylo.fr" style={linkStyle}>contact@kaiylo.fr</a>
            </p>
            <p style={{ ...textStyle, marginTop: '12px' }}>
              Vous pouvez également supprimer votre compte directement depuis la plateforme, ce qui entraîne la suppression de toutes vos données dans un délai de 30 jours.
            </p>
          </Section>

          <Section title="7. Droit de recours — CNIL">
            <p style={textStyle}>
              Si vous estimez que vos droits ne sont pas respectés, vous avez le droit de déposer une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :<br /><br />
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={linkStyle}>www.cnil.fr</a><br />
              3 Place de Fontenoy — TSA 80715 — 75334 PARIS CEDEX 07<br />
              Tél. : 01 53 73 22 22
            </p>
          </Section>

          <Section title="8. Cookies">
            <p style={textStyle}>
              Kaiylo utilise uniquement des cookies techniques nécessaires au fonctionnement du service (authentification, préférences de session). Certains services tiers (Sentry) peuvent déposer des cookies à des fins de monitoring. Vous pouvez gérer votre consentement via la bannière de cookies présente sur le site.
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

const thStyle = {
  fontSize: '12px',
  fontWeight: 400,
  color: 'rgba(255,255,255,0.9)',
  padding: '8px 12px',
  borderBottom: '0.5px solid rgba(255,255,255,0.1)',
  fontFamily: "'Inter', sans-serif"
};

const tdStyle = {
  fontSize: '13px',
  fontWeight: 300,
  color: 'rgba(255,255,255,0.7)',
  padding: '8px 12px',
  borderBottom: '0.5px solid rgba(255,255,255,0.05)',
  fontFamily: "'Inter', sans-serif",
  lineHeight: '1.5'
};

export default PolitiqueConfidentialitePage;
