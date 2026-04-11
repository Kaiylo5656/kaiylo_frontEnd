import { useState, useCallback } from 'react';
import BaseModal from '@/components/ui/modal/BaseModal';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/config/api';

const ClientLimitModal = ({ isOpen, onClose, plan, limit, count }) => {
  const { getAuthToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleUpgrade = useCallback(async () => {
    try {
      setIsLoading(true);
      setCheckoutError('');
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/billing/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        setCheckoutError('Impossible de créer la session de paiement. Réessayez.');
        return;
      }
      const result = await response.json();
      if (result.success && result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        setCheckoutError(result.error || 'Impossible de créer la session de paiement. Réessayez.');
      }
    } catch {
      setCheckoutError('Erreur lors de la redirection vers le paiement. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  const isFree = plan === 'free';

  const titleIcon = isFree ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      className="h-6 w-6 shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z" />
    </svg>
  ) : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isFree ? 'Vous grandissez !' : 'Limite atteinte'}
      titleIcon={titleIcon}
      modalId="client-limit"
      size="sm"
      titleClassName="text-xl font-semibold"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Tier-specific messaging */}
        {isFree ? (
          <>
            {/* Price badge */}
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">€29</span>
              <span className="text-lg text-zinc-300 font-light">/mois</span>
            </div>

            <div>
              <p className="text-[var(--kaiylo-primary-hex)] text-base font-medium mb-2">
                Bravo, vous accompagnez déjà {count ?? 3} clients !
              </p>
              <p className="text-zinc-300 text-sm font-light">
                C'est un super début. Passez à Pro pour coacher jusqu'à 10 élèves
                et débloquer toutes les fonctionnalités.
              </p>
            </div>

            {/* Checkout error */}
            {checkoutError && (
              <p className="text-amber-400 text-xs">{checkoutError}</p>
            )}

            {/* CTA */}
            <div className="flex flex-col gap-3 w-full pt-1">
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full py-3 rounded-[8px] text-sm font-semibold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-[#a855f7] to-[#0f66c9] transition-[transform,box-shadow,filter] duration-300 ease-out hover:brightness-[1.04] hover:shadow-[0_8px_26px_-12px_rgba(168,85,247,0.28)] hover:-translate-y-px active:translate-y-0 active:brightness-[1.02] active:shadow-[0_4px_18px_-10px_rgba(15,102,201,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Passer à Pro'
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
              >
                Plus tard
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-white text-base font-medium mb-2">
                {count ?? limit} clients, impressionnant !
              </p>
              <p className="text-zinc-300 text-sm font-light">
                Vous avez atteint la capacité maximale du plan Pro ({limit}).
                Un palier supérieur arrive bientôt, restez à l'écoute.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
            >
              Compris
            </button>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default ClientLimitModal;
