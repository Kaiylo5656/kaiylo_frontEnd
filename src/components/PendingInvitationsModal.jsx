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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'en attente de validation':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
      case 'acceptée':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
      case 'annulée':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-4xl mx-auto max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Send className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Demandes en attente
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {/* Bouton de rafraîchissement manuel */}
            <button
              onClick={fetchInvitations}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rafraîchir la liste"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Chargement...</div>
            </div>
          ) : error ? (
            <div className="bg-destructive/20 text-destructive p-4 rounded-md text-center">
              {error}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2">✅ Toutes les invitations ont été acceptées</div>
              <div className="text-sm">Aucune invitation en attente</div>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-muted/50 rounded-lg p-4 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="font-medium text-foreground">
                          {invitation.student_email}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(invitation.status)}
                          <span className="text-sm text-muted-foreground">
                            {getStatusText(invitation.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Date d'envoi: {formatDate(invitation.created_at)}
                      </div>
                      {invitation.invitation_code && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Code d'invitation: <span className="font-mono bg-muted px-2 py-1 rounded text-primary">{invitation.invitation_code}</span>
                        </div>
                      )}
                      {invitation.message && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Message: {invitation.message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {(invitation.status === 'sent' || invitation.status === 'envoyée' || 
                        invitation.status === 'pending' || invitation.status === 'en attente de validation') && (
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-md hover:bg-primary/30 transition-colors"
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
        <div className="flex justify-end p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingInvitationsModal;
