import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import BaseModal from './ui/modal/BaseModal';

const StudentRegistrationModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [invitationError, setInvitationError] = useState(null);
  const { login } = useAuth();
  const API_BASE_URL = getApiBaseUrlWithApi();
  const navigate = useNavigate();

  // Form handling with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    setValue,
    reset
  } = useForm();

  // Watch password for confirmation validation
  const password = watch('password');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setInvitationData(null);
      setInvitationError(null);
    }
  }, [isOpen, reset]);

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

  // Handle invitation code input
  const handleInvitationCodeChange = async (e) => {
    const code = e.target.value.trim().toUpperCase();
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
      // Combine firstName and lastName into name for backend
      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Check if user has an invitation code
      const invitationCodeValue = data.invitationCode?.trim().toUpperCase();
      
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
        console.error('Student registration error:', error);
        console.error('Error response:', error.response?.data);
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
          await login(result.user.email, data.password, navigate);
          
          // Close modal
          onClose();
        } else {
          // If no token (email confirmation required)
          setError('root', {
            type: 'manual',
            message: result.message || 'Account created successfully. Please check your email to confirm your account before logging in.'
          });
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      modalId="student-registration-modal"
      title="Inscription Étudiant"
      size="lg"
      zIndex={100}
      footer={
        <button
          type="submit"
          form="student-registration-form"
          disabled={isLoading || !invitationData}
          className="w-full rounded-xl bg-[#d4845a] hover:bg-[#d4845a]/90 text-white py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4845a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Inscription en cours...' : 'Rejoindre le programme'}
        </button>
      }
    >
      <>
        {/* Information section */}
        <div className="bg-[rgba(212,132,90,0.1)] rounded-lg p-4 border border-[rgba(212,132,90,0.3)]">
          <h3 className="text-sm font-semibold text-[#d4845a] mb-2">
            Comment fonctionne l'inscription étudiant
          </h3>
          <ul className="text-xs text-[rgba(255,255,255,0.8)] space-y-1">
            <li>• Les étudiants peuvent uniquement rejoindre Kaiylo via une invitation de leur coach.</li>
            <li>• Si vous n'avez pas de code d'invitation, contactez votre coach pour en recevoir un.</li>
            <li>• Note: Chaque code d'invitation ne peut être utilisé qu'une seule fois.</li>
          </ul>
        </div>

        {/* Form */}
        <form id="student-registration-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6 pb-2">
          {/* Invitation Code Field */}
          <div>
            <label htmlFor="invitationCode" className="block text-sm font-medium text-white mb-2">
              Code d'invitation
            </label>
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
              className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                invitationError ? 'border-red-400' : invitationData ? 'border-[#d4845a]' : ''
              }`}
              placeholder="Entrez votre code d'invitation à 8 chiffres"
              maxLength={8}
            />
            {errors.invitationCode && (
              <p className="mt-1 text-xs text-red-500">{errors.invitationCode.message}</p>
            )}
            {invitationError && (
              <p className="mt-1 text-xs text-red-500">{invitationError}</p>
            )}
            {invitationData && !invitationError && (
              <p className="mt-1 text-xs text-[#d4845a]">
                ✅ Invitation valide pour {invitationData.student_email}
              </p>
            )}
          </div>

          {/* First Name Field */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-white mb-2">
              Prénom
            </label>
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
              className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                errors.firstName ? 'border-red-400' : ''
              }`}
              placeholder="Entrez votre prénom"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name Field */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-white mb-2">
              Nom
            </label>
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
              className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                errors.lastName ? 'border-red-400' : ''
              }`}
              placeholder="Entrez votre nom"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>

          {/* Email Field (read-only if invitation is validated) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Adresse mail
            </label>
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
              disabled={!!invitationData}
              className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                errors.email ? 'border-red-400' : invitationData ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              placeholder={invitationData ? invitationData.student_email : "L'email sera défini par l'invitation"}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
            {invitationData && (
              <p className="mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                L'email est automatiquement défini par votre invitation
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
              Mot de passe
            </label>
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
              className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                errors.password ? 'border-red-400' : ''
              }`}
              placeholder="Créez un mot de passe fort"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
              Confirmer le mot de passe
            </label>
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
              className={`w-full p-3 rounded-[10px] border-[0.5px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white placeholder:text-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,255,255,0.4)] ${
                errors.confirmPassword ? 'border-red-400' : ''
              }`}
              placeholder="Confirmez votre mot de passe"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Root Error Display */}
          {errors.root && (
            <div className="rounded-[10px] border border-red-400 bg-red-900/20 p-3">
              <p className="text-sm text-red-400">{errors.root.message}</p>
            </div>
          )}

          {/* Sign in link */}
          <p className="text-center text-sm text-[rgba(255,255,255,0.8)] mt-4 mb-2">
            Déjà un compte ?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="text-[#d4845a] hover:underline font-medium"
            >
              Connectez-vous ici
            </button>
          </p>
        </form>
      </>
    </BaseModal>
  );
};

export default StudentRegistrationModal;

