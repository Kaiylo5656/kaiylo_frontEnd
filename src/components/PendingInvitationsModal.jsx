import React, { useState, useEffect } from 'react';
import { X, Send, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';

const PendingInvitationsModal = ({ isOpen, onClose }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      console.error('Error fetching invitations:', err);
      setError('Erreur lors du chargement des invitations. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      // You can implement resend functionality here
      console.log('Resending invitation:', invitationId);
      // For now, just refresh the list
      await fetchInvitations();
    } catch (err) {
      console.error('Error resending invitation:', err);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
          background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(89, 93, 101, 0.5) 100%)',
          opacity: 0.95
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} />
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
              Demandes en attente
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Bouton de rafraîchissement manuel */}
            <button
              onClick={fetchInvitations}
              disabled={loading}
              className="text-white/50 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
              title="Rafraîchir la liste"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
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
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-4"
          style={{ 
            scrollbarGutter: 'stable',
            WebkitOverflowScrolling: 'touch',
            maxHeight: 'calc(92vh - 73px - 80px)'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-white/50">Chargement...</div>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-lg text-center border border-red-500/30">
              {error}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <div className="mb-2">✅ Toutes les invitations ont été acceptées</div>
              <div className="text-sm">Aucune invitation en attente</div>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-[rgba(0,0,0,0.5)] rounded-[10px] p-4 border-[0.5px] border-[rgba(255,255,255,0.05)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-2 flex-wrap">
                        <div className="font-normal text-white truncate">
                          {invitation.student_email}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusIcon(invitation.status)}
                          <span className="text-sm text-white/50">
                            {getStatusText(invitation.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-white/50">
                        Date d'envoi: {formatDate(invitation.created_at)}
                      </div>
                      {invitation.invitation_code && (
                        <div className="text-sm text-white/50 mt-1">
                          Code d'invitation: <span className="font-mono bg-[rgba(212,132,89,0.15)] px-2 py-1 rounded text-[#d4845a]">{invitation.invitation_code}</span>
                        </div>
                      )}
                      {invitation.message && (
                        <div className="text-sm text-white/50 mt-1">
                          Message: {invitation.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(invitation.status === 'sent' || invitation.status === 'envoyée' || 
                        invitation.status === 'pending' || invitation.status === 'en attente de validation') && (
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="px-3 py-1.5 bg-[#d4845a]/20 text-[#d4845a] text-sm rounded-lg hover:bg-[#d4845a]/30 transition-colors font-normal whitespace-nowrap"
                        >
                          Renvoyer l'invitation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-[#0f0f10]/95 backdrop-blur">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-normal"
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
