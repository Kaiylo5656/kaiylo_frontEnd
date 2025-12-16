import React, { useEffect, useState } from 'react';
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

  const onSubmit = async (data) => {
    try {
      const result = await login(data.email, data.password, navigate);
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

  if (loading && !user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex flex-col antialiased relative" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Angular gradient cone - background unifié sans couture */}
      {/* Container unique avec pseudo-elements pour éviter toute ligne blanche au centre */}
      <div className="angular-gradient-cone" />
      
      {/* Carré supérieur avec blur - Transition entre lumière et fond noir */}
      {/* Dimensions Figma: 1857x1015, Position: x=-59, y=102 */}
      <div 
        className="absolute pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
          left: '0',
          top: '0',
          backgroundColor: 'rgba(0, 0, 0, 0)',
          backdropFilter: 'blur(50px)',
          filter: 'none',
          zIndex: 1
        }}
      />
      
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-10">
        <Logo />
      </header>

      <main className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center">
          <div className="w-full">
            <h1 className="text-3xl font-thin text-foreground" style={{ fontSize: '35px', marginBottom: '50px' }}>
              Connexion
            </h1>

            {authError && (
              <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
                {authError}
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
                    border: '0.5px solid rgba(33, 33, 33, 1)',
                    borderColor: 'rgba(33, 33, 33, 1)',
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

              <div className="relative">
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  className="w-full p-3 pr-12 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    color: 'rgba(255, 255, 255, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(33, 33, 33, 1)',
                    borderColor: 'rgba(33, 33, 33, 1)',
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
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center text-muted-foreground hover:text-primary transition-colors"
                  style={{ marginLeft: '10px', paddingLeft: '15px', paddingRight: '15px' }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <Eye className="h-5 w-5" strokeWidth={1} style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} /> : <EyeOff className="h-5 w-5" strokeWidth={1} style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} />}
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
                className="w-full bg-primary text-primary-foreground font-light p-3 rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 mt-[25px]"
                style={{
                  backgroundColor: 'rgba(212, 132, 89, 1)',
                  color: 'rgba(255, 255, 255, 1)',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  paddingRight: '12px'
                }}
                disabled={loading}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
            
            <p className="mt-6 text-sm text-muted-foreground" style={{ fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)' }}>
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
