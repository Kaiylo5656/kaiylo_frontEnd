import logger from '../utils/logger';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Logo from '../components/Logo';

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isPasswordAutofilled, setIsPasswordAutofilled] = useState(false);
  const [isConfirmPasswordAutofilled, setIsConfirmPasswordAutofilled] = useState(false);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const { login } = useAuth();
  const API_BASE_URL = getApiBaseUrlWithApi();
  const navigate = useNavigate();

  // Form handling with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
    setError
  } = useForm();

  // Watch password for confirmation validation
  const password = watch('password');

  // Détecter l'autofill pour le champ mot de passe
  useEffect(() => {
    const checkAutofill = (inputRef, setAutofilled) => {
      if (inputRef.current) {
        const input = inputRef.current;
        const hasValue = input.value.length > 0;
        
        if (!hasValue) {
          setAutofilled(false);
          return;
        }

        const computedStyle = window.getComputedStyle(input);
        const boxShadow = computedStyle.boxShadow;
        const autofillColors = [
          'rgb(250, 255, 189)',
          'rgb(232, 240, 254)',
          'rgb(255, 255, 221)',
          'rgb(255, 255, 255)'
        ];
        
        const hasAutofillShadow = boxShadow && boxShadow !== 'none' && 
                                 autofillColors.some(color => boxShadow.includes(color));
        
        const bgColor = computedStyle.backgroundColor;
        const hasAutofillBg = bgColor && 
                              autofillColors.some(color => bgColor.includes(color));
        
        setAutofilled(hasAutofillShadow || hasAutofillBg);
      }
    };

    const checkPasswordAutofill = () => checkAutofill(passwordInputRef, setIsPasswordAutofilled);
    const checkConfirmPasswordAutofill = () => checkAutofill(confirmPasswordInputRef, setIsConfirmPasswordAutofilled);

    // Vérifier immédiatement et après des délais
    checkPasswordAutofill();
    checkConfirmPasswordAutofill();
    setTimeout(checkPasswordAutofill, 100);
    setTimeout(checkConfirmPasswordAutofill, 100);
    setTimeout(checkPasswordAutofill, 500);
    setTimeout(checkConfirmPasswordAutofill, 500);

    // Vérifier périodiquement
    const interval = setInterval(() => {
      checkPasswordAutofill();
      checkConfirmPasswordAutofill();
    }, 300);
    
    const passwordInput = passwordInputRef.current;
    const confirmPasswordInput = confirmPasswordInputRef.current;
    
    if (passwordInput) {
      passwordInput.addEventListener('animationstart', checkPasswordAutofill);
      passwordInput.addEventListener('input', checkPasswordAutofill);
    }
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('animationstart', checkConfirmPasswordAutofill);
      confirmPasswordInput.addEventListener('input', checkConfirmPasswordAutofill);
    }

    return () => {
      clearInterval(interval);
      if (passwordInput) {
        passwordInput.removeEventListener('animationstart', checkPasswordAutofill);
        passwordInput.removeEventListener('input', checkPasswordAutofill);
      }
      if (confirmPasswordInput) {
        confirmPasswordInput.removeEventListener('animationstart', checkConfirmPasswordAutofill);
        confirmPasswordInput.removeEventListener('input', checkConfirmPasswordAutofill);
      }
    };
  }, []);

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
        logger.error('Registration error:', error);
        logger.error('Error response:', error.response?.data);
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
          // If no token (email confirmation required), redirect to success page
          // The user will need to confirm email before logging in
          navigate(`/registration/success?email=${encodeURIComponent(data.email)}`);
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
              Inscription
            </h1>

            {/* Information section for coaches - Accordion */}
            <div 
              className="mb-6 rounded-[10px] bg-[rgba(255,255,255,0.05)] overflow-hidden transition-all duration-300"
              style={{ marginBottom: '30px' }}
            >
              {/* Header - Clickable */}
              <button
                type="button"
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                style={{ 
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <h2 className="text-sm font-normal text-[#d4845a]">
                  Comment fonctionne l'inscription ?
                </h2>
                <div className="flex-shrink-0 ml-4">
                  {isInfoExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[#d4845a]" strokeWidth={2} />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#d4845a]" strokeWidth={2} />
                  )}
                </div>
              </button>

              {/* Content - Expandable */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isInfoExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 space-y-3" style={{ paddingLeft: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <p className="text-xs text-[rgba(255,255,255,1)] text-left font-medium">
                    Inscrivez-vous en tant que coach pour créer et gérer vos programmes d'entraînement.
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,1)] font-light text-left">
                    Après l'inscription, vous pourrez inviter vos élèves par email depuis votre tableau de bord.
                  </p>
                  <p className="text-xs text-[rgba(212,132,90,1)] text-left">
                    <span className="text-[#d4845a]">Note :</span> Les élèves ne peuvent rejoindre que via les invitations de leur coach.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-left" style={{ width: '384px', maxWidth: '100%', margin: '0 auto' }}>
              {/* First Name Field */}
              <div style={{ marginBottom: '3px' }}>
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
                  className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    width: '384px',
                    maxWidth: '100%',
                    color: 'rgba(255, 255, 255, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderColor: errors.firstName && dirtyFields.firstName ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    fontWeight: '300',
                    boxShadow: 'none',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                  placeholder="Prénom"
                  aria-invalid={errors.firstName ? 'true' : 'false'}
                />
                {errors.firstName && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name Field */}
              <div style={{ marginBottom: '3px' }}>
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
                  className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    width: '384px',
                    maxWidth: '100%',
                    color: 'rgba(255, 255, 255, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderColor: errors.lastName && dirtyFields.lastName ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    fontWeight: '300',
                    boxShadow: 'none',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                  placeholder="Nom"
                  aria-invalid={errors.lastName ? 'true' : 'false'}
                />
                {errors.lastName && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.lastName.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div style={{ marginBottom: '3px' }}>
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Adresse mail requise',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Adresse mail invalide',
                    },
                  })}
                  className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    width: '384px',
                    maxWidth: '100%',
                    color: 'rgba(255, 255, 255, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderColor: errors.email && dirtyFields.email ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    fontWeight: '300',
                    boxShadow: 'none',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                  placeholder="Adresse mail"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
                {errors.email && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '3px' }}>
                <div className="relative">
                  <input
                    id="password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Mot de passe requis',
                      minLength: {
                        value: 6,
                        message: 'Le mot de passe doit contenir au moins 6 caractères'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
                      }
                    })}
                    className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                    style={{
                      width: '384px',
                      maxWidth: '100%',
                      color: 'rgba(255, 255, 255, 1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '0.5px solid rgba(255, 255, 255, 0.1)',
                      borderColor: errors.password && dirtyFields.password ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      fontWeight: '300',
                      boxShadow: 'none',
                      paddingLeft: '20px',
                      paddingRight: '50px',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                    }}
                    placeholder="Mot de passe"
                    aria-invalid={errors.password ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    style={{ paddingLeft: '15px', paddingRight: '15px', zIndex: 10, width: '50px' }}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div style={{ marginBottom: '3px' }}>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    ref={confirmPasswordInputRef}
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword', {
                      required: 'Confirmation du mot de passe requise',
                      validate: (value) => {
                        if (value !== password) {
                          return 'Les mots de passe ne correspondent pas';
                        }
                        return true;
                      }
                    })}
                    className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                    style={{
                      width: '384px',
                      maxWidth: '100%',
                      color: 'rgba(255, 255, 255, 1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '0.5px solid rgba(255, 255, 255, 0.1)',
                      borderColor: errors.confirmPassword && dirtyFields.confirmPassword ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      fontWeight: '300',
                      boxShadow: 'none',
                      paddingLeft: '20px',
                      paddingRight: '50px',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                    }}
                    placeholder="Confirmer le mot de passe"
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    style={{ paddingLeft: '15px', paddingRight: '15px', zIndex: 10, width: '50px' }}
                    aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isConfirmPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isConfirmPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Root Error Display */}
              {errors.root && (
                <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
                  {errors.root.message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-light p-3 rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 mt-[25px]"
                style={{
                  width: '384px',
                  maxWidth: '100%',
                  backgroundColor: 'rgba(212, 132, 89, 1)',
                  color: 'rgba(255, 255, 255, 1)',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  paddingRight: '12px'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Création en cours...' : "S'inscrire"}
              </button>

              {/* CGU Text */}
              <p className="text-xs text-center mt-4 px-2" style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: '300', fontSize: '14px', lineHeight: '1.5' }}>
                En créant un compte vous acceptez les{' '}
                <span style={{ color: 'rgba(212, 132, 90, 1)', fontWeight: '400' }}>CGU et conditions d'utilisation</span>
              </p>
            </form>

            {/* Student invitation section */}
            <div className="mt-6 mb-6 p-4 rounded-[10px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
              <h2 className="text-sm font-medium text-[#d4845a] mb-2 text-left">
                Êtes-vous un élève ?
              </h2>
              <p className="text-xs text-[rgba(255,255,255,0.8)] mb-3 text-left font-light">
                Si vous avez un code d'invitation de votre coach, cliquez ici :
              </p>
              <Link
                to="/register/student"
                className="w-full bg-primary text-primary-foreground font-light p-3 rounded-[10px] hover:bg-primary/90 transition-colors inline-block text-center"
                style={{
                  width: '384px',
                  maxWidth: '100%',
                  backgroundColor: 'rgba(212, 132, 89, 1)',
                  color: 'rgba(255, 255, 255, 1)',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  paddingRight: '12px'
                }}
              >
                Rejoindre avec un code d'invitation
              </Link>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground" style={{ fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)' }}>
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
