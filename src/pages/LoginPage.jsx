import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo'; // Import the new Logo component

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, error: authError, loading } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    await login(data.email, data.password, navigate);
  };

  return (
    <div className="min-h-screen flex flex-col antialiased">
      <header className="absolute top-0 left-0 w-full p-4 md:p-6">
        <Logo />
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center">
          <div className="w-full">
            <h1 className="text-3xl font-bold mb-6 text-foreground">
              Connexion
            </h1>

            {authError && (
              <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
              <div>
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
                  className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-2 focus:ring-ring focus:outline-none"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type="password"
                  placeholder="Mot de passe"
                  className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-2 focus:ring-ring focus:outline-none"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
              
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold p-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
            
            <p className="mt-6 text-sm text-muted-foreground">
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
