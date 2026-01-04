import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';

const InviteStudentModal = ({ isOpen, onClose, onInviteSent }) => {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
        onInviteSent?.(response.data.data);
        reset();
        onClose();
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
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative mx-auto w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(89, 93, 101, 0.5) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} />
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Ajouter un nouvel élève
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
            <label htmlFor="email" className="block text-sm font-light text-white/80 mb-2">
              Email élève
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
              placeholder="Adresse email de l'élève"
              className="w-full px-4 py-3 bg-[rgba(0,0,0,0.5)] text-white rounded-[10px] border-[0.5px] border-[rgba(255,255,255,0.05)] focus:outline-none focus:ring-1 focus:ring-[#d4845a] focus:border-[#d4845a] placeholder:text-white/30"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-light text-white/80 mb-2">
              Message (optionnel)
            </label>
            <textarea
              {...register('message')}
              id="message"
              rows={3}
              placeholder="Message personnalisé pour l'invitation..."
              className="w-full px-4 py-3 bg-[rgba(0,0,0,0.5)] text-white rounded-[10px] border-[0.5px] border-[rgba(255,255,255,0.05)] focus:outline-none focus:ring-1 focus:ring-[#d4845a] focus:border-[#d4845a] resize-none placeholder:text-white/30"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-normal"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#d4845a] text-white rounded-lg hover:bg-[#d66d35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-normal"
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
