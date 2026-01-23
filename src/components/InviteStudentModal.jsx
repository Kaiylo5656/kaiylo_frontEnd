import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';

const InviteStudentModal = ({ isOpen, onClose, onInviteSent }) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  
  const successGreenColor = '#22c55e';

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${getApiBaseUrlWithApi()}/invitations/create`,
        {
          studentEmail: data.email,
          message: data.message || `Bonjour ! ${user?.email || 'Votre coach'} vous invite à rejoindre Kaiylo.`
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSentEmail(data.email);
        setShowSuccessModal(true);
        onInviteSent?.(response.data.data);
      } else {
        setError(response.data.message || 'Erreur lors de l\'envoi de l\'invitation');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(
        err.response?.data?.message || 
        'Erreur lors de l\'envoi de l\'invitation. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError('');
    setShowSuccessModal(false);
    setSentEmail('');
    onClose();
  };

  const handleSuccessClose = () => {
    reset();
    setShowSuccessModal(false);
    setSentEmail('');
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  // Success Modal
  if (showSuccessModal) {
    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
        style={{ zIndex: 100 }}
        onClick={handleSuccessClose}
      >
        <div 
          className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-2xl flex flex-col"
          style={{
            background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
            opacity: 0.95
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-center">
            <h2 className="text-xl font-normal flex items-center gap-2" style={{ color: successGreenColor }}>
              Invitation envoyée
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 448 512" 
                className="h-5 w-5"
                fill="currentColor"
              >
                <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
              </svg>
            </h2>
          </div>
          <div className="border-b border-white/10 mx-6"></div>

          {/* Success Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-8">
            <div className="text-center">
              <p className="text-sm text-white/50 font-light mb-8">
                Votre client <span className="font-normal text-white">{sentEmail}</span> va recevoir un email avec son code d'invitation.
              </p>
              <button
                onClick={handleSuccessClose}
                className="w-full px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
      style={{ zIndex: 100 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="relative mx-auto w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center justify-end gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
              <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z"/>
            </svg>
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Ajouter un nouveau client
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
              <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
            </svg>
          </button>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-5">
          {error && (
            <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/30">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-extralight text-white/50 mb-2">
              Email client
            </label>
            <input
              {...register('email', {
                required: 'L\'adresse email est requise',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Adresse email invalide',
                },
              })}
              type="email"
              id="email"
              placeholder="Adresse email du client"
              className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
            >
              {isLoading ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteStudentModal;
