import { useState } from 'react';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const successGreenColor = '#22c55e';

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

      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Erreur lors de l\'envoi du feedback. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setType('bug');
    setSeverity('medium');
    setShowSuccessModal(false);
    onClose();
  };

  const handleSuccessClose = () => {
    setTitle('');
    setDescription('');
    setType('bug');
    setSeverity('medium');
    setShowSuccessModal(false);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (isSubmitting) return;
      handleClose();
    }
  };

  if (!isOpen) return null;

  // Success Modal
  if (showSuccessModal) {
    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
        style={{ zIndex: 150 }}
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
              Feedback envoyé
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
                Merci ! Votre feedback a été envoyé avec succès.
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
      style={{ zIndex: 150 }}
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
          <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5" fill="currentColor">
              <path d="M256 0c14.7 0 28.2 8.1 35.2 21l216 400c6.7 12.4 6.4 27.4-.8 39.5S486.1 480 472 480L40 480c-14.1 0-27.2-7.4-34.4-19.5s-7.5-27.1-.8-39.5l216-400c7-12.9 20.5-21 35.2-21zm0 352a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.5 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"/>
            </svg>
            Signaler un problème
          </h2>
          <button
            onClick={handleClose}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Close modal"
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
              <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
            </svg>
          </button>
        </div>
        <div className="border-b border-white/10 mx-6"></div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type de feedback */}
              <div>
                <p className="text-sm font-extralight text-white/50 mb-3 text-center">Type de feedback</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('bug')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                      type === 'bug'
                        ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                        : 'bg-black/50 text-white/50 hover:bg-black/70'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="16" height="16" fill="currentColor" aria-hidden="true" className={type !== 'bug' ? 'opacity-50' : ''}>
                      <path d="M192 96c0-53 43-96 96-96s96 43 96 96l0 3.6c0 15.7-12.7 28.4-28.4 28.4l-135.1 0c-15.7 0-28.4-12.7-28.4-28.4l0-3.6zm345.6 12.8c10.6 14.1 7.7 34.2-6.4 44.8l-97.8 73.3c5.3 8.9 9.3 18.7 11.8 29.1l98.8 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-96 0 0 32c0 2.6-.1 5.3-.2 7.9l83.4 62.5c14.1 10.6 17 30.7 6.4 44.8s-30.7 17-44.8 6.4l-63.1-47.3c-23.2 44.2-66.5 76.2-117.7 83.9L312 280c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 230.2c-51.2-7.7-94.5-39.7-117.7-83.9L83.2 473.6c-14.1 10.6-34.2 7.7-44.8-6.4s-7.7-34.2 6.4-44.8l83.4-62.5c-.1-2.6-.2-5.2-.2-7.9l0-32-96 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l98.8 0c2.5-10.4 6.5-20.2 11.8-29.1L44.8 153.6c-14.1-10.6-17-30.7-6.4-44.8s30.7-17 44.8-6.4L192 184c12.3-5.1 25.8-8 40-8l112 0c14.2 0 27.7 2.8 40 8l108.8-81.6c14.1-10.6 34.2-7.7 44.8 6.4z"/>
                    </svg>
                    Bug
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('feedback')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                      type === 'feedback'
                        ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                        : 'bg-black/50 text-white/50 hover:bg-black/70'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor" aria-hidden="true" className={type !== 'feedback' ? 'opacity-50' : ''}>
                      <path d="M0 352L0 128C0 75 43 32 96 32l320 0c53 0 96 43 96 96l0 224c0 53-43 96-96 96l-120 0c-5.2 0-10.2 1.7-14.4 4.8L166.4 539.2c-4.2 3.1-9.2 4.8-14.4 4.8-13.3 0-24-10.7-24-24l0-72-32 0c-53 0-96-43-96-96z"/>
                    </svg>
                    Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('feature_request')}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-normal transition-colors ${
                      type === 'feature_request'
                        ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                        : 'bg-black/50 text-white/50 hover:bg-black/70'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="16" height="16" fill="currentColor" aria-hidden="true" className={type !== 'feature_request' ? 'opacity-50' : ''}>
                      <path d="M292.9 384c7.3-22.3 21.9-42.5 38.4-59.9 32.7-34.4 52.7-80.9 52.7-132.1 0-106-86-192-192-192S0 86 0 192c0 51.2 20 97.7 52.7 132.1 16.5 17.4 31.2 37.6 38.4 59.9l201.7 0zM288 432l-192 0 0 16c0 44.2 35.8 80 80 80l32 0c44.2 0 80-35.8 80-80l0-16zM184 112c-39.8 0-72 32.2-72 72 0 13.3-10.7 24-24 24s-24-10.7-24-24c0-66.3 53.7-120 120-120 13.3 0 24 10.7 24 24s-10.7 24-24 24z"/>
                    </svg>
                    Suggestion
                  </button>
                </div>
              </div>

              {/* Titre */}
              <div>
                <label htmlFor="feedback-title" className="block text-sm font-extralight text-white/50 mb-2">
                  Titre
                </label>
                <input
                  id="feedback-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Intitulé du problème ou de la suggestion"
                  disabled={isSubmitting}
                  className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="feedback-description" className="block text-sm font-extralight text-white/50 mb-2">
                  Description
                </label>
                <textarea
                  id="feedback-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez en détail le problème ou votre suggestion..."
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-base placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Sévérité (pour les bugs) */}
              {type === 'bug' && (
                <div>
                  <p className="text-sm font-extralight text-white/50 mb-3 text-center">Sévérité</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-1.5">
                    <button
                      type="button"
                      onClick={() => setSeverity('low')}
                      disabled={isSubmitting}
                      className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[13px] font-normal transition-colors whitespace-nowrap ${
                        severity === 'low'
                          ? 'bg-[#d4845a] text-white hover:bg-[#c47850]'
                          : 'bg-black/50 text-white/50 hover:bg-black/70'
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
                          : 'bg-black/50 text-white/50 hover:bg-black/70'
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
                          : 'bg-black/50 text-white/50 hover:bg-black/70'
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
                          : 'bg-black/50 text-white/50 hover:bg-black/70'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Critique
                    </button>
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className={`px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className={`px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
              >
                {isSubmitting ? (
                  'Envoi...'
                ) : (
                  'Envoyer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

