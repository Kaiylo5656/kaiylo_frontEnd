import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo'; // Import the new Logo component
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, error: authError, loading, user } = useAuth();
  const navigate = useNavigate();
  // Local UI state to control password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const passwordInputRef = useRef(null);

  const getTargetPath = (role) => {
    switch (role) {
      case 'coach':
        return '/coach/dashboard';
      case 'student':
        return '/student/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate(getTargetPath(user.role), { replace: true });
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
      
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-10">
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

            {authError && (
              <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
                {authError}
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
                    border: '0.5px solid rgba(255, 255, 255, 0.05)',
                    borderColor: errors.email ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.05)',
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
                    border: '0.5px solid rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
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
                    <Eye className="h-5 w-5" strokeWidth={1} style={{ color: isAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} />
                  ) : (
                    <EyeOff className="h-5 w-5" strokeWidth={1} style={{ color: isAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} />
                  )}
                </button>
              </div>
              
              <div className="text-right sm:text-right text-left pr-[5px]" style={{ marginTop: '5px', paddingTop: '0px', paddingBottom: '0px', color: 'rgba(250, 250, 250, 0.75)' }}>
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
