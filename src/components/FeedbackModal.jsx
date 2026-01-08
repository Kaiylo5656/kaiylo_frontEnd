import { useState } from 'react';
import { X, Bug, MessageSquare, Lightbulb, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';
import axios from 'axios';

export default function FeedbackModal({ isOpen, onClose }) {
  const { getAuthToken } = useAuth();
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        alert('Erreur d\'authentification');
        return;
      }

      // Collecter les informations du navigateur
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        url: window.location.href,
        screenSize: {
          width: window.screen.width,
          height: window.screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      await axios.post(
        buildApiUrl('/feedback'),
        {
          type,
          title: title.trim(),
          description: description.trim(),
          severity,
          url: window.location.href,
          browser_info: browserInfo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setDescription('');
        setType('bug');
        setSeverity('medium');
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Erreur lors de l\'envoi du feedback. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (isSubmitting) return;
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-[#1a1a1a] rounded-[25px] w-full max-w-md mx-4 overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-4 text-center" style={{ paddingTop: '20px', paddingBottom: '15px' }}>
          <h2 className="text-[var(--kaiylo-primary-hex)] text-xl font-normal">
            Signaler un problème ou envoyer un feedback
          </h2>
        </div>

        {/* Content */}
        <div className="px-[25px] py-0 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="text-green-500 text-4xl mb-4">✅</div>
              <p className="text-white text-xs font-light">Merci ! Votre feedback a été envoyé.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type de feedback */}
              <div>
                <p className="text-gray-400 text-xs font-light mb-3 text-center">Type de feedback</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('bug')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                      type === 'bug'
                        ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                        : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Bug size={16} />
                    Bug
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('feedback')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                      type === 'feedback'
                        ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                        : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <MessageSquare size={16} />
                    Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('feature_request')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                      type === 'feature_request'
                        ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                        : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Lightbulb size={16} />
                    Suggestion
                  </button>
                </div>
              </div>

              {/* Titre */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Résumé du problème ou suggestion"
                  disabled={isSubmitting}
                  className="w-full bg-[#262626] border border-white/10 rounded-lg p-3 text-white text-xs font-light placeholder-gray-400 focus:outline-none focus:border-[#d4845a] disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez en détail le problème ou votre suggestion..."
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full bg-[#262626] border border-white/10 rounded-lg p-3 text-white text-xs font-light placeholder-gray-400 resize-none focus:outline-none focus:border-[#d4845a] disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Sévérité (pour les bugs) */}
              {type === 'bug' && (
                <div>
                  <p className="text-gray-400 text-xs font-light mb-3 text-center">Sévérité</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setSeverity('low')}
                      disabled={isSubmitting}
                      className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[13px] font-normal transition-colors whitespace-nowrap ${
                        severity === 'low'
                          ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                          : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Faible
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity('medium')}
                      disabled={isSubmitting}
                      className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[13px] font-normal transition-colors whitespace-nowrap ${
                        severity === 'medium'
                          ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                          : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Moyenne
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity('high')}
                      disabled={isSubmitting}
                      className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[13px] font-normal transition-colors whitespace-nowrap ${
                        severity === 'high'
                          ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                          : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Élevée
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity('critical')}
                      disabled={isSubmitting}
                      className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[13px] font-normal transition-colors whitespace-nowrap ${
                        severity === 'critical'
                          ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                          : 'bg-[#262626] text-gray-300 hover:bg-[#404040]'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Critique
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex flex-col gap-2 px-[25px] pt-[15px] pb-[20px]">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className={`flex-1 py-2 px-4 bg-[#d4845a] hover:bg-[#c47850] text-white rounded-lg font-light text-[13px] transition-colors flex items-center justify-center gap-2 ${
                (isSubmitting || !title.trim() || !description.trim()) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                'Envoi...'
              ) : (
                <>
                  <Send size={16} />
                  Envoyer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 py-2 px-4 bg-[#262626] hover:bg-[#404040] text-white rounded-lg font-light text-[13px] transition-colors ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

