import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

const ResetPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [sessionVerified, setSessionVerified] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const { updatePassword, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Check for session validity manually to handle the recovery flow robustly
  useEffect(() => {
    const verifySession = async () => {
      // If AuthContext already has a user, we are good
      if (user) {
        setSessionVerified(true);
        return;
      }

      // Otherwise, check Supabase session directly (handles the case where AuthContext is lagging or hash was consumed)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session && !error) {
        logger.debug('✅ Session verified directly via Supabase');
        setSessionVerified(true);
      } else {
        logger.debug('⚠️ No active session found for password reset');
        // Check if we have error params in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDescription = hashParams.get('error_description');
        if (errorDescription) {
          setError(decodeURIComponent(errorDescription));
        }
      }
    };

    if (!authLoading) {
      verifySession();
    }
  }, [user, authLoading]);

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use AuthContext updatePassword if available, otherwise fallback to direct Supabase call
      let result;
      if (user) {
        result = await updatePassword(data.password);
      } else {
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: data.password
        });
        if (updateError) throw updateError;
        result = { success: true, data: updateData };
      }

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Une erreur est survenue. Veuillez réessayer.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  // If session is not verified and we are not loading, show error or login link
  // But allow a grace period if the URL contains a token (to avoid flashing error before session check completes)
  const hasTokenInUrl = window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery');

  if (!sessionVerified && !hasTokenInUrl && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: '#0a0a0a', color: 'white' }}>
        <Logo />
        <div className="mt-8 max-w-md w-full bg-[rgba(255,255,255,0.05)] p-6 rounded-xl border border-[rgba(255,255,255,0.1)]">
          <h2 className="text-xl font-semibold mb-4 text-destructive">Lien invalide ou expiré</h2>
          <p className="text-gray-300 mb-6">
            {error || "Nous n'avons pas pu vérifier votre session. Le lien de réinitialisation est peut-être expiré ou a déjà été utilisé."}
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col antialiased relative" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Mobile Background Elements (Hidden on Desktop) */}
      <div className="md:hidden">
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
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
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
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite 1.5s'
          }}
        />
        {/* Glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
            opacity: 0.35,
            zIndex: 5
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
          style={{
            background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
            opacity: 0.45,
            zIndex: 5
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
          style={{
            background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
            opacity: 0.25,
            zIndex: 5
          }}
        />
      </div>

      {/* Desktop Background Elements (Original) */}
      <div className="hidden md:block">
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
      </div>

      <main className="flex-grow flex items-center justify-center p-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center">
          <div className="w-full" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
            <h1 className="text-3xl font-thin text-foreground" style={{ fontSize: '35px', marginBottom: '50px' }}>
              Nouveau mot de passe
            </h1>

            {isSuccess ? (
              <>
                <div className="mb-6 p-4 rounded-[10px] bg-[rgba(255,255,255,0.02)] border border-[rgba(212,132,90,0.05)] text-left">
                  <p className="text-sm text-[rgba(255,255,255,0.8)] mb-4 font-light">
                    Votre mot de passe a été mis à jour avec succès.
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,0.6)] font-light">
                    Vous allez être redirigé vers la page de connexion...
                  </p>
                </div>
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline font-semibold inline-flex items-center gap-2 mt-6"
                  style={{ color: 'rgba(212, 132, 90, 1)' }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </>
            ) : (
              <>
                {error && (
                  <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
                  <div style={{ marginBottom: '3px' }}>
                    <input
                      {...register('password', {
                        required: 'Nouveau mot de passe requis',
                        minLength: {
                          value: 6,
                          message: 'Le mot de passe doit contenir au moins 6 caractères'
                        }
                      })}
                      type="password"
                      placeholder="Nouveau mot de passe"
                      className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                      style={{
                        color: 'rgba(255, 255, 255, 1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        borderColor: errors.password ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        fontWeight: '300',
                        boxShadow: 'none',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                      }}
                    />
                    {errors.password && (
                      <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <div style={{ marginBottom: '3px' }}>
                    <input
                      {...register('confirmPassword', {
                        required: 'Confirmation requise',
                        validate: (val) => {
                          if (watch('password') != val) {
                            return "Les mots de passe ne correspondent pas";
                          }
                        }
                      })}
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                      style={{
                        color: 'rgba(255, 255, 255, 1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        borderColor: errors.confirmPassword ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        fontWeight: '300',
                        boxShadow: 'none',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                      }}
                    />
                    {errors.confirmPassword && (
                      <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground font-light p-3 rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 mt-[25px]"
                    style={{
                      backgroundColor: 'rgba(212, 132, 89, 1)',
                      color: 'rgba(255, 255, 255, 1)',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      paddingLeft: '12px',
                      paddingRight: '12px'
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
