import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import LoadingSpinner from '../components/LoadingSpinner';
import { CheckCircle, XCircle } from 'lucide-react';

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Parse hash fragment first (Supabase often uses hash for redirects)
        const hash = window.location.hash.substring(1); // Remove the #
        const hashParams = new URLSearchParams(hash);
        
        // Check for errors in hash (Supabase redirects errors in hash)
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          setStatus('error');
          console.error('Email confirmation error from hash:', { error, errorCode, errorDescription });
          
          if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            setMessage('Ce lien de confirmation a expiré. Veuillez demander un nouveau lien de confirmation depuis la page de connexion.');
          } else if (errorCode === 'access_denied') {
            setMessage('Lien de confirmation invalide ou expiré. Veuillez demander un nouveau lien de confirmation.');
          } else {
            setMessage(`Erreur de confirmation : ${errorDescription || error}. Veuillez réessayer ou contacter le support.`);
          }
          return;
        }

        // Try to get token_hash from hash first, then from query string
        let tokenHash = hashParams.get('token_hash');
        let type = hashParams.get('type');
        
        // Fallback to query string if not found in hash
        if (!tokenHash) {
          tokenHash = searchParams.get('token_hash');
          type = searchParams.get('type');
        }

        // Also check for access_token in hash (alternative Supabase format / Implicit Flow)
        if (!tokenHash) {
          const accessToken = hashParams.get('access_token');
          const tokenType = hashParams.get('type');
          
          if (accessToken) {
            if (tokenType === 'recovery') {
              // This might be a password reset token, not email confirmation
              setStatus('error');
              setMessage('Type de lien incorrect. Ce lien ne correspond pas à une confirmation d\'email.');
              return;
            }

            // Implicit Flow Success: Supabase has already confirmed the email and provided a session
            // The supabase-js client might pick this up automatically from the URL hash, 
            // but we can manually confirm success here.
            setStatus('success');
            setMessage('Votre email a été confirmé avec succès ! Vous pouvez maintenant vous connecter.');
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 3000);
            return;
          }
        }

        if (!tokenHash) {
          setStatus('error');
          setMessage('Lien de confirmation invalide. Le token est manquant.');
          return;
        }

        // Verify the email confirmation token
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type || 'email'
        });

        if (verifyError) {
          console.error('Email confirmation error:', verifyError);
          setStatus('error');
          
          // Provide user-friendly error messages
          if (verifyError.message?.includes('expired') || verifyError.message?.includes('invalid') || verifyError.message?.includes('expiré')) {
            setMessage('Ce lien de confirmation a expiré ou est invalide. Veuillez demander un nouveau lien de confirmation depuis la page de connexion.');
          } else if (verifyError.message?.includes('already') || verifyError.message?.includes('déjà')) {
            setMessage('Votre email a déjà été confirmé. Vous pouvez vous connecter.');
          } else {
            setMessage(`Erreur lors de la confirmation de l'email : ${verifyError.message || 'Veuillez réessayer.'}`);
          }
          return;
        }

        if (data?.user) {
          setStatus('success');
          setMessage('Votre email a été confirmé avec succès ! Vous pouvez maintenant vous connecter.');
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Erreur lors de la confirmation. Aucune donnée utilisateur retournée.');
        }
      } catch (error) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('Une erreur inattendue s\'est produite. Veuillez réessayer.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

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

      <main className="flex-grow flex items-center justify-center p-4 relative overflow-y-auto" style={{ zIndex: 20, position: 'relative' }}>
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center px-4" style={{ position: 'relative', zIndex: 21 }}>
          <div className="w-full" style={{ position: 'relative', zIndex: 22 }}>
            
            {status === 'loading' && (
              <div className="text-center bg-black/20 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-xl">
                <LoadingSpinner />
                <h2 className="mt-6 text-2xl font-light text-white">
                  Confirmation en cours...
                </h2>
                <p className="mt-2 text-white/70 font-light">
                  Veuillez patienter pendant que nous confirmons votre adresse email.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center bg-black/20 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex justify-center mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-light text-white mb-4">
                  Email confirmé avec succès !
                </h2>
                <p className="text-white/70 font-light mb-6">
                  {message}
                </p>
                <p className="text-sm text-white/50 font-light mb-8">
                  Redirection vers la connexion dans quelques secondes...
                </p>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full bg-[#D48459] text-white font-light p-3 rounded-[10px] hover:bg-[#D48459]/90 transition-colors"
                  style={{
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  Aller à la page de connexion
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center bg-black/20 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex justify-center mb-6">
                  <XCircle className="h-16 w-16 text-red-500" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-light text-white mb-4">
                  Erreur de confirmation
                </h2>
                <p className="text-white/70 font-light mb-8">
                  {message}
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => navigate('/login', { replace: true })}
                    className="w-full bg-[#D48459] text-white font-light p-3 rounded-[10px] hover:bg-[#D48459]/90 transition-colors"
                  >
                    Aller à la page de connexion
                  </button>
                  <button
                    onClick={() => navigate('/register', { replace: true })}
                    className="w-full bg-white/5 text-white font-light p-3 rounded-[10px] hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Créer un nouveau compte
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfirmEmailPage;