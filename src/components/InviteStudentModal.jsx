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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/[0.85] flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Ajouter un nouvel élève
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-destructive/20 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
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
              className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-2 focus:ring-ring focus:outline-none"
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
              Message (optionnel)
            </label>
            <textarea
              {...register('message')}
              id="message"
              rows={3}
              placeholder="Message personnalisé pour l'invitation..."
              className="w-full p-3 bg-input text-foreground rounded-md border border-border focus:ring-2 focus:ring-ring focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
