import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import Logo from '../components/Logo';
import StudentRegistrationModal from '../components/StudentRegistrationModal';

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const { login } = useAuth();
  const API_BASE_URL = getApiBaseUrlWithApi();
  const navigate = useNavigate();

  // Form handling with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm();

  // Watch password for confirmation validation
  const password = watch('password');

  // Handle form submission
  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      let result;

      // Combine firstName and lastName into name for backend
      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Coach registration
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: fullName,
        email: data.email,
        password: data.password,
        role: 'coach'
      }).catch(error => {
        console.error('Registration error:', error);
        console.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
        throw new Error(errorMessage);
      });
      
      result = response.data;
      
      if (result.success) {
        // If token is provided, set up auth and redirect
        if (result.token && result.user) {
          // Store token and set up axios headers
          localStorage.setItem('authToken', result.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${result.token}`;
          
          // Use login function to properly initialize auth state
          // This will set up the user state and Supabase session
          await login(result.user.email, data.password, navigate);
        } else {
          // If no token (email confirmation required), just show message
          // The user will need to confirm email before logging in
          setError('root', {
            type: 'manual',
            message: result.message || 'Account created successfully. Please check your email to confirm your account before logging in.'
          });
        }
      } else {
        // Set form error
        setError('root', {
          type: 'manual',
          message: result.error || result.message || 'Registration failed'
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: error.message || 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto register-page-scrollbar">
      {/* Dark gradient background matching Figma design */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 150% 100% at 50% -30%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(100, 100, 100, 0.3) 40%, rgba(50, 50, 50, 0.5) 60%, rgba(20, 20, 20, 0.8) 80%, rgba(0, 0, 0, 1) 100%)',
        }}
      />
      {/* Additional overlay for depth and blur effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.5) 100%)',
          filter: 'blur(80px)',
          opacity: 0.6,
        }}
      />

      {/* Logo at top left */}
      <div className="absolute left-10 top-10 z-10">
        <Logo />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center px-4 py-12 min-h-screen">
        <div className="w-full max-w-[452px] space-y-[30px] py-8">
          {/* Form container */}
          <div className="flex flex-col items-end space-y-[35px]">
            {/* Title and form fields */}
            <div className="w-full space-y-[40px]">
              {/* Title */}
              <h1 className="text-3xl font-bold mb-6 text-white">
                Inscription
              </h1>

              {/* Information section for coaches */}
              <div className="mb-6 p-4 rounded-[10px] bg-[rgba(212,132,90,0.1)] border border-[rgba(212,132,90,0.3)]">
                <h2 className="text-sm font-semibold text-[#d4845a] mb-2">
                  Comment rejoindre Kaiylo
                </h2>
                <p className="text-xs text-[rgba(255,255,255,0.8)] mb-2">
                  Inscrivez-vous en tant que coach pour créer et gérer des programmes d'entraînement pour vos étudiants.
                </p>
                <p className="text-xs text-[rgba(255,255,255,0.8)] mb-3">
                  Après l'inscription, vous pourrez inviter vos étudiants par email depuis votre tableau de bord.
                </p>
                <p className="text-xs font-semibold text-[#d4845a]">
                  Note: Les étudiants ne peuvent rejoindre que via les invitations de leur coach.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* First Name Field */}
                <div>
                  <input
                    id="firstName"
                    type="text"
                    {...register('firstName', {
                      required: 'Prénom est requis',
                      minLength: {
                        value: 2,
                        message: 'Le prénom doit contenir au moins 2 caractères'
                      }
                    })}
                    className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-foreground placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                      errors.firstName ? 'border-red-400' : ''
                    }`}
                    placeholder="Prénom"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name Field */}
                <div>
                  <input
                    id="lastName"
                    type="text"
                    {...register('lastName', {
                      required: 'Nom est requis',
                      minLength: {
                        value: 2,
                        message: 'Le nom doit contenir au moins 2 caractères'
                      }
                    })}
                    className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-foreground placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                      errors.lastName ? 'border-red-400' : ''
                    }`}
                    placeholder="Nom"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <input
                    id="email"
                    type="email"
                    {...register('email', {
                      required: 'Adresse mail est requise',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Adresse mail invalide'
                      }
                    })}
                    className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-foreground placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                      errors.email ? 'border-red-400' : ''
                    }`}
                    placeholder="Adresse mail"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <input
                    id="password"
                    type="password"
                    {...register('password', {
                      required: 'Mot de passe est requis',
                      minLength: {
                        value: 6,
                        message: 'Le mot de passe doit contenir au moins 6 caractères'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
                      }
                    })}
                    className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-foreground placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                      errors.password ? 'border-red-400' : ''
                    }`}
                    placeholder="Mot de passe"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword', {
                      required: 'Confirmation du mot de passe est requise',
                      validate: (value) => {
                        if (value !== password) {
                          return 'Les mots de passe ne correspondent pas';
                        }
                        return true;
                      }
                    })}
                    className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-foreground placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                      errors.confirmPassword ? 'border-red-400' : ''
                    }`}
                    placeholder="Confirmer le mot de passe"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Root Error Display */}
                {errors.root && (
                  <div className="rounded-[10px] border border-red-400 bg-red-900/20 p-3">
                    <p className="text-sm text-red-400">{errors.root.message}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`mt-[35px] w-full bg-[#d4845a] text-primary-foreground font-semibold p-3 rounded-[10px] border-[0.5px] border-[rgba(255,255,255,0.2)] hover:bg-[#d4845a]/90 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    isLoading ? 'opacity-50' : ''
                  }`}
                >
                  {isLoading ? 'Création en cours...' : "S'inscrire"}
                </button>
              </form>

              {/* Student invitation section - moved to bottom */}
              <div className="mt-6 p-4 rounded-[10px] bg-[rgba(212,132,90,0.1)] border border-[rgba(212,132,90,0.3)]">
                <h2 className="text-sm font-semibold text-[#d4845a] mb-2">
                  Êtes-vous un étudiant ?
                </h2>
                <p className="text-xs text-[rgba(255,255,255,0.8)] mb-3">
                  Si vous avez un code d'invitation de votre coach, cliquez ici :
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsStudentModalOpen(true);
                  }}
                  className="w-full bg-[#d4845a] hover:bg-[#d4845a]/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Rejoindre avec un code d'invitation
                </button>
              </div>
            </div>

            {/* Terms text */}
            <p className="text-center text-sm text-[rgba(255,255,255,0.75)]">
              En créant un compte vous acceptez les{' '}
              <span className="font-normal text-[#d4845a]">CGU et</span>{' '}
              <span className="font-normal text-[#d4845a]">conditions d'utilisation</span>
            </p>
          </div>
        </div>
      </div>

      {/* "Already have account" link at bottom */}
      <div className="absolute bottom-[50px] left-1/2 z-10 -translate-x-1/2">
        <Link
          to="/login"
          className="text-center text-sm text-white hover:text-[#d4845a] transition-colors"
        >
          Déjà un compte ?{' '}
          <span className="font-semibold text-[#d4845a]">Connectez-vous</span>
        </Link>
      </div>

      {/* Student Registration Modal */}
      <StudentRegistrationModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </div>
  );
};

export default RegisterPage;
