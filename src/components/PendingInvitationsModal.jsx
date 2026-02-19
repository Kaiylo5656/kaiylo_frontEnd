import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useOverlayModal } from '../contexts/VideoModalContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';

const PendingInvitationsModal = ({ isOpen, onClose }) => {
  const { registerModalOpen, registerModalClose } = useOverlayModal();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      registerModalOpen();
      return () => registerModalClose();
    }
  }, [isOpen, registerModalOpen, registerModalClose]);

  useEffect(() => {
    if (isOpen) {
      // Charger les invitations uniquement à l'ouverture de la modale
      fetchInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchInvitations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/invitations/coach`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Filtrer les invitations acceptées et expirées pour ne garder que celles en attente
        const allInvitations = response.data.data || [];
        const pendingInvitations = allInvitations.filter(invitation => {
          const status = invitation.status?.toLowerCase() || '';
          // Exclure les invitations acceptées et expirées (peu importe la langue)
          return status !== 'accepted' && 
                 status !== 'acceptée' && 
                 status !== 'accepte' &&
                 status !== 'validated' &&
                 status !== 'validée' &&
                 status !== 'expired' &&
                 status !== 'expirée' &&
                 status !== 'expire';
        });
        setInvitations(pendingInvitations);
      } else {
        setError(response.data.message || 'Erreur lors du chargement des invitations');
      }
    } catch (err) {
      logger.error('Error fetching invitations:', err);
      setError('Erreur lors du chargement des invitations. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      setResendingId(invitationId);
      setError('');
      setSuccessMessage('');
      const response = await axios.post(
        `${getApiBaseUrlWithApi()}/invitations/resend/${invitationId}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Refresh the list to update timestamps
        await fetchInvitations();
        setSuccessMessage('Invitation renvoyée avec succès');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.data.message || 'Erreur lors du renvoi de l\'invitation');
      }
    } catch (err) {
      logger.error('Error resending invitation:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors du renvoi de l\'invitation';
      setError(errorMessage);
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      const response = await axios.delete(
        `${getApiBaseUrlWithApi()}/invitations/cancel/${invitationId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Refresh the list
        await fetchInvitations();
      } else {
        logger.error('Failed to cancel invitation:', response.data.message);
        setError(response.data.message || 'Erreur lors de la suppression de l\'invitation');
      }
    } catch (err) {
      logger.error('Error canceling invitation:', err);
      setError('Erreur lors de la suppression de l\'invitation');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'envoyée':
        return <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'pending':
      case 'en attente de validation':
        return <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />;
      case 'accepted':
      case 'acceptée':
        return <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'cancelled':
      case 'annulée':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      default:
        return <Clock className="w-4 h-4 text-white/30" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'sent':
      case 'envoyée':
        return 'Envoyée';
      case 'pending':
      case 'en attente de validation':
        return 'En attente de validation';
      case 'accepted':
      case 'acceptée':
        return 'Acceptée';
      case 'cancelled':
      case 'annulée':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Envoyé il y a moins d\'une minute';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? 'Envoyé il y a 1 minute' : `Envoyé il y a ${diffInMinutes} minutes`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return diffInHours === 1 ? 'Envoyé il y a 1 heure' : `Envoyé il y a ${diffInHours} heures`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return diffInDays === 1 ? 'Envoyé il y a 1 jour' : `Envoyé il y a ${diffInDays} jours`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return diffInWeeks === 1 ? 'Envoyé il y a 1 semaine' : `Envoyé il y a ${diffInWeeks} semaines`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return diffInMonths === 1 ? 'Envoyé il y a 1 mois' : `Envoyé il y a ${diffInMonths} mois`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return diffInYears === 1 ? 'Envoyé il y a 1 an' : `Envoyé il y a ${diffInYears} ans`;
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative mx-auto w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
              <path d="M536.4-26.3c9.8-3.5 20.6-1 28 6.3s9.8 18.2 6.3 28l-178 496.9c-5 13.9-18.1 23.1-32.8 23.1-14.2 0-27-8.6-32.3-21.7l-64.2-158c-4.5-11-2.5-23.6 5.2-32.6l94.5-112.4c5.1-6.1 4.7-15-.9-20.6s-14.6-6-20.6-.9L229.2 276.1c-9.1 7.6-21.6 9.6-32.6 5.2L38.1 216.8c-13.1-5.3-21.7-18.1-21.7-32.3 0-14.7 9.2-27.8 23.1-32.8l496.9-178z"/>
            </svg>
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Demandes en attente
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div 
                className="rounded-full border-2 border-transparent animate-spin"
                style={{
                  borderTopColor: '#d4845a',
                  borderRightColor: '#d4845a',
                  width: '24px',
                  height: '24px'
                }}
              />
            </div>
          ) : error ? (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-lg text-center border border-red-500/30">
              {error}
            </div>
          ) : successMessage ? (
            <div className="bg-green-500/20 text-green-400 p-4 rounded-lg text-center border border-green-500/30">
              {successMessage}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-white/50 font-light text-sm">
              Aucune invitation en attente
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-[rgba(0,0,0,0.5)] rounded-[16px] py-4 px-6 border-[0.5px] border-[rgba(255,255,255,0.05)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-none max-w-xs min-w-0">
                      <div className="flex items-center gap-4 mb-2 flex-wrap">
                        <div className="font-normal text-white truncate">
                          {invitation.student_email}
                        </div>
                      </div>
                      <div className="text-sm text-white/50 font-light">
                        {getTimeAgo(invitation.created_at)}
                      </div>
                      {invitation.message && (
                        <div className="text-sm text-white/50 mt-1">
                          Message: {invitation.message}
                        </div>
                      )}
                    </div>
                    {invitation.invitation_code && (
                      <div className="text-sm text-white/50 font-light shrink-0">
                        Code d'invitation: <span className="font-mono bg-[rgba(212,132,89,0.15)] px-2 py-1 rounded text-[#d4845a]">{invitation.invitation_code}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 shrink-0">
                      {(invitation.status === 'sent' || invitation.status === 'envoyée' || 
                        invitation.status === 'pending' || invitation.status === 'en attente de validation') && (
                        <>
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="text-sm transition-colors font-normal whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ color: 'var(--kaiylo-primary-hex)' }}
                            title="Renvoyer l'invitation"
                            disabled={resendingId === invitation.id}
                          >
                            {resendingId === invitation.id ? 'Envoi...' : 'Renvoyer'}
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="p-1 transition-colors group"
                            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--kaiylo-primary-hex)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                            }}
                            title="Supprimer l'invitation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                              <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingInvitationsModal;
