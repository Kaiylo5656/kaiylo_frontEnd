import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';
import Logo from '../components/Logo';

const RegistrationSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen flex flex-col antialiased relative" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Image de fond */}
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
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
      
      {/* Layer blur sur l'écran */}
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(100px)',
          backgroundColor: 'rgba(0, 0, 0, 0.01)',
          zIndex: 6,
          pointerEvents: 'none',
          opacity: 1
        }}
      />
      
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-50">
        <Logo />
      </header>

      {/* Gradient conique Figma - partie droite */}
      <div 
        style={{
          position: 'absolute',
          top: '-175px',
          left: '0',
          transform: 'translateY(-50%)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          boxShadow: 'none',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite'
        }}
      />
      
      {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
      <div 
        style={{
          position: 'absolute',
          top: '-175px',
          left: '50vw',
          transform: 'translateY(-50%) scaleX(-1)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          boxShadow: 'none',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite 1.5s'
        }}
      />

      <main className="flex-grow flex items-start justify-center p-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center pt-16 pb-16">
          <div className="w-full" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
            <h1 className="text-3xl font-thin text-foreground" style={{ fontSize: '35px', marginBottom: '50px' }}>
              Compte créé avec succès
            </h1>

            {/* Success Card */}
            <div 
              className="w-full rounded-[20px] p-6 text-center"
              style={{
                backgroundColor: 'rgba(18, 18, 18, 0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                marginBottom: '30px'
              }}
            >
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500" strokeWidth={1.5} />
              </div>

              {/* Message */}
              <div className="space-y-4 mb-6">
                <p 
                  className="text-base leading-relaxed"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  Votre compte a été créé avec succès.
                </p>
                
                <div 
                  className="rounded-lg p-4 flex items-start gap-3"
                  style={{
                    backgroundColor: 'rgba(212, 132, 90, 0.1)',
                    border: '1px solid rgba(212, 132, 90, 0.3)'
                  }}
                >
                  <Mail 
                    size={18} 
                    style={{ 
                      color: '#d4845a', 
                      marginTop: '2px',
                      flexShrink: 0
                    }} 
                  />
                  <p 
                    className="text-sm leading-relaxed text-left"
                    style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                  >
                    Veuillez vérifier votre boîte de réception{email ? ` (${email})` : ''} et cliquer sur le lien de confirmation pour activer votre compte avant de vous connecter.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block w-full"
                >
                  <button
                    type="button"
                    className="w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                    style={{
                      backgroundColor: '#d4845a',
                      color: '#ffffff',
                      border: 'none'
                    }}
                  >
                    Aller à la page de connexion
                  </button>
                </Link>
              </div>

              {/* Help Text */}
              <p 
                className="text-xs mt-6"
                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
              >
                Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam ou contactez le support.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegistrationSuccessPage;
