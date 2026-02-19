import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { resetPasswordForEmail } = useAuth();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPasswordForEmail(data.email, window.location.origin + '/reset-password');

      if (result.success) {
        setIsSuccess(true);
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

  return (
    <div className="flex flex-col antialiased relative overflow-hidden" style={{ backgroundColor: '#0a0a0a', height: '100dvh', minHeight: '100vh' }}>
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

      <main className="flex-1 min-h-0 flex items-center justify-center p-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center">
          <div className="w-full" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
            <h1 className="text-3xl font-extralight text-foreground" style={{ fontSize: '35px', marginBottom: '50px' }}>
              Réinitialiser votre mot de passe
            </h1>

            {isSuccess ? (
              <>
                <div className="mb-6 p-4 rounded-[10px] bg-[rgba(255,255,255,0.02)] border border-[rgba(212,132,90,0.05)] text-left">
                  <p className="text-sm text-[rgba(255,255,255,0.8)] mb-4 font-light">
                    Si un compte existe avec cette adresse email, vous recevrez un lien pour réinitialiser votre mot de passe.
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,0.6)] font-light">
                    Vérifiez votre boîte de réception et votre dossier de spam.
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
                      {...register('email', {
                        required: 'Adresse mail requise',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'Adresse mail invalide',
                        },
                      })}
                      type="email"
                      placeholder="Adresse mail"
                      className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                      style={{
                        color: 'rgba(255, 255, 255, 1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                        borderColor: errors.email ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        fontWeight: '300',
                        boxShadow: 'none',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                      }}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
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
                    {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                  </button>
                </form>

                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline font-semibold inline-flex items-center gap-2 mt-6"
                  style={{ color: 'rgba(212, 132, 90, 1)' }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;

