import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Logo from '../components/Logo';

const StudentRegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [invitationError, setInvitationError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const { login } = useAuth();
  const API_BASE_URL = getApiBaseUrlWithApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Form handling with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
    setError,
    setValue,
    reset,
    trigger
  } = useForm();

  // Watch password for confirmation validation
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  // Trigger validation of confirmPassword when password changes
  useEffect(() => {
    if (confirmPassword) {
      trigger('confirmPassword');
    }
  }, [password, trigger, confirmPassword]);

  // Reset form when component unmounts or navigates away
  useEffect(() => {
    return () => {
      reset();
      setInvitationData(null);
      setInvitationError(null);
    };
  }, [reset]);

  // Validate invitation code
  const validateInvitationCode = async (code) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/invitations/validate/${code}`);
      if (response.data.success) {
        setInvitationData(response.data.data);
        setValue('email', response.data.data.student_email);
        setInvitationError(null);
      }
    } catch (error) {
      setInvitationError(error.response?.data?.message || 'Code d\'invitation invalide');
      setInvitationData(null);
    }
  };

  // Handle URL query parameters for invitation code
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setValue('invitationCode', codeFromUrl);
      validateInvitationCode(codeFromUrl);
    }
  }, [searchParams, setValue]);

  // Handle invitation code input
  const handleInvitationCodeChange = async (e) => {
    const code = e.target.value.trim();
    if (code.length === 8) {
      await validateInvitationCode(code);
    } else {
      setInvitationData(null);
      setInvitationError(null);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      // Validate that passwords match
      if (data.password !== data.confirmPassword) {
        setError('confirmPassword', {
          type: 'manual',
          message: 'Les mots de passe ne correspondent pas'
        });
        setIsLoading(false);
        return;
      }

      // Combine firstName and lastName into name for backend
      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Check if user has an invitation code
      const invitationCodeValue = data.invitationCode?.trim();
      
      if (!invitationCodeValue || invitationCodeValue.length !== 8) {
        setError('invitationCode', {
          type: 'manual',
          message: 'Le code d\'invitation est requis (8 caractères)'
        });
        setIsLoading(false);
        return;
      }

      if (!invitationData) {
        // Validate invitation code first
        await validateInvitationCode(invitationCodeValue);
        if (invitationError || !invitationData) {
          setError('root', {
            type: 'manual',
            message: 'Code d\'invitation invalide ou expiré'
          });
          setIsLoading(false);
          return;
        }
      }

      const response = await axios.post(`${API_BASE_URL}/invitations/accept`, {
        invitationCode: invitationCodeValue,
        name: fullName,
        password: data.password
      }).catch(error => {
        logger.error('Student registration error:', error);
        logger.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
        throw new Error(errorMessage);
      });
      
      const result = response.data;
      
      if (result.success) {
        // If token is provided, set up auth and redirect
        if (result.token && result.user) {
          // Store token and set up axios headers
          localStorage.setItem('authToken', result.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${result.token}`;
          
          // Use login function to properly initialize auth state
          await login(result.user.email, data.password, navigate, '/onboarding');
        } else {
          // If no token (email confirmation required), redirect to success page
          // The user will need to confirm email before logging in
          navigate(`/registration/success?email=${encodeURIComponent(data.email)}`);
        }
      } else {
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
          <div className="w-full px-4">
            <h1 className="text-3xl font-thin text-foreground" style={{ fontSize: '35px', marginBottom: '50px' }}>
              Inscription Élève
            </h1>

            {/* Information section - Accordion */}
            <div 
              className="mb-6 rounded-[10px] bg-[rgba(255,255,255,0.02)] overflow-hidden transition-all duration-300"
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
                  backgroundColor: 'rgba(255, 255, 255, 0.08)'
                }}
              >
                <h2 className="text-sm font-normal text-[#d4845a]">
                  Comment fonctionne l'inscription élève ?
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
                  <p className="text-xs text-[rgba(255,255,255,1)] text-left font-light">
                    Les élèves peuvent uniquement rejoindre Kaiylo via une invitation de leur coach.
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,1)] font-light text-left">
                    Si vous n'avez pas de code d'invitation, contactez votre coach pour en recevoir un.
                  </p>
                  <p className="text-xs text-[rgba(212,132,90,1)] text-left font-medium">
                    <span className="text-[#d4845a]">Note :</span> Chaque code d'invitation ne peut être utilisé qu'une seule fois.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-left" style={{ width: '384px', maxWidth: '100%', margin: '0 auto' }}>
              {/* Invitation Code Field */}
              <div style={{ marginBottom: '3px' }}>
                <input
                  id="invitationCode"
                  type="text"
                  {...register('invitationCode', {
                    required: 'Le code d\'invitation est requis',
                    minLength: {
                      value: 8,
                      message: 'Le code doit contenir 8 caractères'
                    },
                    maxLength: {
                      value: 8,
                      message: 'Le code doit contenir 8 caractères'
                    }
                  })}
                  onChange={handleInvitationCodeChange}
                  className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-1 focus:ring-ring focus:outline-none"
                  style={{
                    width: '384px',
                    maxWidth: '100%',
                    color: 'rgba(255, 255, 255, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderColor: (errors.invitationCode && dirtyFields.invitationCode) || invitationError 
                      ? 'rgba(239, 68, 68, 1)' 
                      : invitationData 
                        ? 'rgba(212, 132, 90, 1)' 
                        : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    fontWeight: '300',
                    boxShadow: 'none',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '10px',
                    paddingBottom: '10px'
                  }}
                  placeholder="Code d'invitation"
                  maxLength={8}
                  aria-invalid={errors.invitationCode || invitationError ? 'true' : 'false'}
                />
                {errors.invitationCode && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.invitationCode.message}</p>
                )}
                {invitationError && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {invitationError}</p>
                )}
                {invitationData && !invitationError && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(212, 132, 90, 1)' }}>
                    ✅ Invitation valide pour {invitationData.student_email}
                  </p>
                )}
              </div>

              {/* Email Field (read-only, automatically set by invitation) */}
              <div style={{ marginBottom: '3px' }}>
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
                  disabled={true}
                  value={invitationData?.student_email || ''}
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
                    opacity: 0.6,
                    cursor: 'not-allowed'
                  }}
                  placeholder="L'email sera défini par l'invitation"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
                {errors.email && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.email.message}</p>
                )}
                {invitationData && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    L'email est automatiquement défini par votre invitation
                  </p>
                )}
              </div>

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

              {/* Password Field */}
              <div style={{ marginBottom: '3px' }}>
                <div className="relative">
                  <input
                    id="password"
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
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
                disabled={isLoading || !invitationData}
              >
                {isLoading ? 'Inscription en cours...' : 'Rejoindre le programme'}
              </button>

              {/* CGU Text */}
              <p className="text-xs text-center mt-4 px-2" style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: '300', fontSize: '14px', lineHeight: '1.5' }}>
                En créant un compte vous acceptez les{' '}
                <span style={{ color: 'rgba(212, 132, 90, 1)', fontWeight: '400' }}>CGU et conditions d'utilisation</span>
              </p>
            </form>

            {/* Back to coach registration */}
            <div className="mt-6 mb-6 p-4 rounded-[10px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
              <h2 className="text-sm font-medium text-[#d4845a] mb-2 text-left">
                Vous êtes coach ?
              </h2>
              <p className="text-xs text-[rgba(255,255,255,0.8)] mb-3 text-left font-light">
                Inscrivez-vous en tant que coach pour créer et gérer vos programmes d'entraînement :
              </p>
              <Link
                to="/register"
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
                Inscrivez-vous en tant que coach
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

export default StudentRegisterPage;

