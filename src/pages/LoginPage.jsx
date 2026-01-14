import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo'; // Import the new Logo component
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, error: authError, loading, user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Local UI state to control password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const passwordInputRef = useRef(null);
  
  // Get error from URL parameters (for OAuth callbacks)
  const urlError = searchParams.get('error');
  const displayError = authError || urlError;

  const getTargetPath = (role, onboardingCompleted) => {
    switch (role) {
      case 'coach':
        return '/coach/dashboard';
      case 'student':
        // Check if onboarding is completed
        const isOnboardingCompleted = onboardingCompleted !== false; // Default to true if not specified
        return isOnboardingCompleted ? '/student/dashboard' : '/onboarding';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate(getTargetPath(user.role, user.onboardingCompleted), { replace: true });
    }
  }, [loading, user, navigate]);

  // Détecter l'autofill du mot de passe
  useEffect(() => {
    const checkAutofill = () => {
      if (passwordInputRef.current) {
        const input = passwordInputRef.current;
        // Vérifier si le champ a une valeur
        const hasValue = input.value.length > 0;
        
        if (!hasValue) {
          setIsAutofilled(false);
          return;
        }

        // Vérifier le style calculé pour détecter l'autofill
        // L'autofill webkit ajoute une box-shadow avec une couleur spécifique
        const computedStyle = window.getComputedStyle(input);
        const boxShadow = computedStyle.boxShadow;
        
        // Les couleurs typiques de l'autofill webkit
        const autofillColors = [
          'rgb(250, 255, 189)',  // Chrome jaune
          'rgb(232, 240, 254)',  // Chrome bleu
          'rgb(255, 255, 221)',  // Autre variante jaune
          'rgb(255, 255, 255)'    // Parfois blanc avec shadow
        ];
        
        const hasAutofillShadow = boxShadow && boxShadow !== 'none' && 
                                 autofillColors.some(color => boxShadow.includes(color));
        
        // Vérifier aussi le background-color
        const bgColor = computedStyle.backgroundColor;
        const hasAutofillBg = bgColor && 
                              autofillColors.some(color => bgColor.includes(color));
        
        setIsAutofilled(hasAutofillShadow || hasAutofillBg);
      }
    };

    // Vérifier immédiatement et après un court délai (autofill peut être asynchrone)
    checkAutofill();
    setTimeout(checkAutofill, 100);
    setTimeout(checkAutofill, 500);

    // Vérifier périodiquement
    const interval = setInterval(checkAutofill, 300);
    
    // Écouter l'animation déclenchée par autofill
    const passwordInput = passwordInputRef.current;
    if (passwordInput) {
      passwordInput.addEventListener('animationstart', checkAutofill);
      // Si l'utilisateur modifie le champ, vérifier à nouveau
      passwordInput.addEventListener('input', checkAutofill);
    }

    return () => {
      clearInterval(interval);
      if (passwordInput) {
        passwordInput.removeEventListener('animationstart', checkAutofill);
        passwordInput.removeEventListener('input', checkAutofill);
      }
    };
  }, []);

  const onSubmit = async (data) => {
    console.log('🔐 Form submitted with data:', { email: data.email, hasPassword: !!data.password });
    try {
      const result = await login(data.email, data.password, navigate);
      console.log('🔐 Login result:', result);
      if (!result.success) {
        console.error('Login failed:', result.error);
      }
    } catch (error) {
      console.error('Login exception:', error);
      // S'assurer que loading est remis à false même en cas d'exception
      if (loading) {
        // Le loading devrait être géré par le contexte, mais on peut forcer ici si nécessaire
        console.warn('Forcing loading to false due to exception');
      }
    }
  };

  const onFormSubmit = (e) => {
    console.log('🔐 Form submit event');
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  const onButtonClick = (e) => {
    console.log('🔐 Button clicked, loading:', loading);
    console.log('🔐 Form errors:', errors);
    
    if (loading) {
      e.preventDefault();
      return;
    }
    
    // Si le formulaire ne se soumet pas, forcer la soumission manuellement
    const form = e.currentTarget.closest('form');
    if (form) {
      // Trouver le champ password même s'il change de type
      const passwordInput = passwordInputRef.current || form.querySelector('input[name="password"]');
      const emailInput = form.querySelector('input[type="email"]');
      
      if (emailInput && passwordInput) {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        console.log('🔐 Values from inputs:', { email, hasPassword: !!password });
        
        if (email && password) {
          // Si les valeurs sont présentes, soumettre directement
          console.log('🔐 Submitting directly');
          e.preventDefault();
          onSubmit({ email, password });
        } else {
          // Sinon, déclencher la validation normale
          console.log('🔐 Triggering form submit for validation');
        }
      }
    }
  };

  if (loading && !user) {
    return <LoadingSpinner />;
  }

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
            <h1 className="text-3xl font-thin text-foreground" style={{ fontSize: 'clamp(28px, 5vw, 35px)', marginBottom: 'clamp(30px, 8vw, 50px)' }}>
              Connexion
            </h1>

            {displayError && (
              <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
                {displayError}
              </div>
            )}

            <form onSubmit={onFormSubmit} className="space-y-4 text-left" style={{ position: 'relative', zIndex: 25, pointerEvents: 'auto', width: '384px', maxWidth: '100%', margin: '0 auto' }} noValidate>
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
                  className="p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    width: '384px',
                    maxWidth: '100%',
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

              <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  className="w-full p-3 pr-12 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    width: '384px',
                    maxWidth: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    color: 'rgba(255, 255, 255, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    fontWeight: '300',
                    boxShadow: 'none',
                    paddingLeft: '20px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                {/* Toggle button to reveal or hide the password */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((prev) => !prev);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center text-muted-foreground hover:text-primary transition-colors"
                  style={{ marginLeft: '10px', paddingLeft: '15px', paddingRight: '15px', zIndex: 2, pointerEvents: 'auto' }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" style={{ color: isAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                      <path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" style={{ color: isAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                      <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z"/>
                    </svg>
                  )}
                </button>
              </div>
              
              <div className="text-right pr-[5px]" style={{ marginTop: '5px', paddingTop: '0px', paddingBottom: '0px', color: 'rgba(250, 250, 250, 0.75)' }}>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-muted-foreground transition-colors font-light forgot-password-link" 
                  style={{ opacity: 0.6 }}
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                className="bg-primary text-primary-foreground font-light p-3 rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-[25px]"
                style={{
                  width: '384px',
                  maxWidth: '100%',
                  backgroundColor: 'rgba(212, 132, 89, 1)',
                  color: 'rgba(255, 255, 255, 1)',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  position: 'relative',
                  zIndex: 9999,
                  pointerEvents: loading ? 'none' : 'auto',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  isolation: 'isolate'
                }}
                disabled={loading}
                onClick={onButtonClick}
                onMouseDown={(e) => {
                  console.log('🔐 Button mousedown');
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  console.log('🔐 Button touchstart');
                  e.stopPropagation();
                }}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6" style={{ width: '384px', maxWidth: '100%', margin: '24px auto' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 font-light" style={{ color: 'rgba(255, 255, 255, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(10px)' }}>Ou</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={async () => {
                console.log('🔐 Google sign-in button clicked');
                await signInWithGoogle(navigate);
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-3 rounded-[10px] border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                width: '384px',
                maxWidth: '100%',
                color: 'rgba(255, 255, 255, 1)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '10px',
                paddingBottom: '10px',
                paddingLeft: '12px',
                paddingRight: '12px',
                fontWeight: '300',
                position: 'relative',
                zIndex: 25,
                pointerEvents: loading ? 'none' : 'auto',
                cursor: loading ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                }
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span style={{ fontWeight: '300' }}>
                {loading ? 'Connexion...' : 'Continuer avec Google'}
              </span>
            </button>
            
            <p className="mt-6 text-sm text-muted-foreground text-center" style={{ fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)' }}>
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Inscrivez-vous
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
