import logger from '../utils/logger';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Logo from '../components/Logo';
import LoadingSpinner from '../components/LoadingSpinner';

const RegisterPage = () => {
  const { t } = useTranslation('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isPasswordAutofilled, setIsPasswordAutofilled] = useState(false);
  const [isConfirmPasswordAutofilled, setIsConfirmPasswordAutofilled] = useState(false);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const { login, user, loading } = useAuth();
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
        role: 'coach',
        language: i18next.language
      }).catch(error => {
        logger.error('Registration error:', error);
        logger.error('Error response:', error.response?.data);
        const errorMessage = error.response?.data?.message || error.message || t('register.errors.registration_failed');
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
          message: result.error || result.message || t('register.errors.registration_failed_short')
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: error.message || t('register.errors.unexpected')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTargetPath = (role, onboardingCompleted) => {
    switch (role) {
      case 'coach':
        return '/coach/dashboard';
      case 'student':
        const isOnboardingCompleted = onboardingCompleted !== false;
        return isOnboardingCompleted ? '/student/dashboard' : '/onboarding';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/coach/dashboard';
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate(getTargetPath(user.role, user.onboardingCompleted), { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || user) {
    return <LoadingSpinner />;
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

      <main className="flex-grow flex items-start justify-center p-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center pt-16 pb-16">
          <div className="w-full" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
            <h1 className="text-3xl font-thin text-foreground" style={{ fontSize: '35px', marginBottom: '50px' }}>
              {t('register.title')}
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
                  {t('register.info_toggle')}
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
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isInfoExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="px-4 pb-4 space-y-3" style={{ paddingLeft: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <p className="text-xs text-[rgba(255,255,255,1)] text-left font-medium">
                    {t('register.info_body_1')}
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,1)] font-light text-left">
                    {t('register.info_body_2')}
                  </p>
                  <p className="text-xs text-[rgba(212,132,90,1)] text-left">
                    <span className="text-[#d4845a]">{t('register.info_note_prefix')}</span> {t('register.info_note_body')}
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
                    required: t('register.errors.first_name_required'),
                    minLength: {
                      value: 2,
                      message: t('register.errors.first_name_min')
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
                  placeholder={t('register.first_name_placeholder')}
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
                    required: t('register.errors.last_name_required'),
                    minLength: {
                      value: 2,
                      message: t('register.errors.last_name_min')
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
                  placeholder={t('register.last_name_placeholder')}
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
                    required: t('register.errors.email_required'),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t('register.errors.email_invalid'),
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
                  placeholder={t('register.email_placeholder')}
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
                      required: t('register.errors.password_required'),
                      minLength: {
                        value: 6,
                        message: t('register.errors.password_min')
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: t('register.errors.password_pattern')
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
                    placeholder={t('register.password_placeholder')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    style={{ paddingLeft: '15px', paddingRight: '15px', zIndex: 10, width: '50px' }}
                    aria-label={showPassword ? t('register.hide_password') : t('register.show_password')}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z" />
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
                      required: t('register.errors.confirm_password_required'),
                      validate: (value) => {
                        if (value !== password) {
                          return t('register.errors.password_mismatch');
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
                    placeholder={t('register.confirm_password_placeholder')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    style={{ paddingLeft: '15px', paddingRight: '15px', zIndex: 10, width: '50px' }}
                    aria-label={showConfirmPassword ? t('register.hide_password') : t('register.show_password')}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isConfirmPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: isConfirmPasswordAutofilled ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 0.25)', fontWeight: '200' }} fill="currentColor">
                        <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z" />
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

              {/* CGU Checkbox */}
              <div style={{ marginTop: '20px', marginBottom: '4px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    {...register('acceptCGU', {
                      required: t('register.errors.accept_cgu_required')
                    })}
                    className="kaiylo-checkbox"
                  />
                  <span style={{ fontSize: '13px', fontWeight: 300, color: 'rgba(255,255,255,0.65)', lineHeight: '1.5' }}>
                    {t('register.accept_cgu_prefix')}{' '}
                    <Link
                      to="/cgu"
                      style={{ color: 'rgba(212,132,90,1)', textDecoration: 'none', fontWeight: 400 }}
                    >
                      {t('register.accept_cgu_link')}
                    </Link>
                    {' '}{t('register.accept_cgu_and')}{' '}
                    <Link
                      to="/politique-confidentialite"
                      style={{ color: 'rgba(212,132,90,1)', textDecoration: 'none', fontWeight: 400 }}
                    >
                      {t('register.accept_privacy_link')}
                    </Link>
                  </span>
                </label>
                {errors.acceptCGU && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(239, 68, 68, 0.85)' }}>* {errors.acceptCGU.message}</p>
                )}
              </div>

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
                {isLoading ? t('register.submitting') : t('register.submit')}
              </button>
            </form>

            {/* Student invitation section */}
            <div className="mt-6 mb-6 p-4 rounded-[10px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
              <h2 className="text-sm font-medium text-[#d4845a] mb-2 text-left">
                {t('register.student_invite_title')}
              </h2>
              <p className="text-xs text-[rgba(255,255,255,0.8)] mb-3 text-left font-light">
                {t('register.student_invite_body')}
              </p>
              <Link
                to="/register/student"
                className="w-full bg-primary text-primary-foreground text-sm font-light p-3 rounded-[10px] hover:bg-primary/90 transition-colors inline-block text-center"
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
                {t('register.student_invite_button')}
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground" style={{ fontWeight: '300', color: 'rgba(255, 255, 255, 0.75)' }}>
              {t('register.have_account')}{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                {t('register.login_link')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
