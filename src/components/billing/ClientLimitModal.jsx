import { useState, useCallback } from 'react';
import BaseModal from '@/components/ui/modal/BaseModal';
import { TrendingUp, Loader2, Zap } from 'lucide-react';
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isFree ? 'Vous grandissez !' : 'Limite atteinte'}
      modalId="client-limit"
      size="sm"
      titleClassName="text-xl font-semibold"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Growth icon — decorative */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500/15">
          <TrendingUp className="h-7 w-7 text-amber-400" aria-hidden="true" />
        </div>

        {/* Tier-specific messaging */}
        {isFree ? (
          <>
            <div>
              <p className="text-white text-base font-medium mb-2">
                Bravo, vous accompagnez déjà {count ?? 3} clients !
              </p>
              <p className="text-zinc-300 text-sm font-light">
                C'est un super début. Passez à Pro pour coacher jusqu'à 10 élèves
                et débloquer toutes les fonctionnalités.
              </p>
            </div>

            {/* Price badge */}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">€29</span>
              <span className="text-sm text-zinc-300 font-light">/mois</span>
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
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2 bg-gradient-to-r from-[#a855f7] to-[#0f66c9] border border-white/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Passer à Pro
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
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
              className="w-full py-2.5 rounded-xl text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
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
