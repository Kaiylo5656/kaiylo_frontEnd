import { useState, useCallback } from 'react';
import BaseModal from '@/components/ui/modal/BaseModal';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/config/api';

const PLANS = [
  { name: 'starter', label: 'Starter', price: 29, studentLimit: 10 },
  { name: 'growth',  label: 'Growth',  price: 49, studentLimit: 20 },
  { name: 'scale',   label: 'Scale',   price: 69, studentLimit: 30 },
  { name: 'elite',   label: 'Elite',   price: 89, studentLimit: 40 },
];

const ClientLimitModal = ({ isOpen, onClose, currentPlan = 'free', count }) => {
  const { getAuthToken } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');

  const handleUpgrade = useCallback(async (planName) => {
    try {
      setLoadingPlan(planName);
      setCheckoutError('');
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/billing/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planName })
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
      setLoadingPlan(null);
    }
  }, [getAuthToken]);

  const currentIndex = PLANS.findIndex(p => p.name === currentPlan);
  const upgradePlans = currentIndex === -1 ? PLANS : PLANS.slice(currentIndex + 1);

  const isFree = currentPlan === 'free';

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
        {isFree ? (
          <p className="text-[var(--kaiylo-primary-hex)] text-base font-medium">
            Bravo, vous accompagnez déjà {count ?? 3} clients !
          </p>
        ) : (
          <p className="text-white text-base font-medium">
            {count} clients, impressionnant !
          </p>
        )}

        <p className="text-zinc-300 text-sm font-light -mt-2">
          {upgradePlans.length > 0
            ? 'Choisissez le palier qui correspond à votre activité.'
            : null}
        </p>

        {upgradePlans.length === 0 ? (
          <p className="text-zinc-400 text-sm">
            Vous avez atteint le plan maximum.
          </p>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {upgradePlans.map((plan) => (
              <div
                key={plan.name}
                className="flex items-center justify-between rounded-[8px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{plan.label}</p>
                  <p className="text-xs text-zinc-400">Jusqu'à {plan.studentLimit} élèves</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-white">
                    €{plan.price}
                    <span className="text-xs font-light text-zinc-400">/mo</span>
                  </span>
                  <button
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={loadingPlan !== null}
                    className="py-2 px-3 rounded-[8px] text-xs font-semibold text-white flex items-center gap-1.5 bg-gradient-to-r from-[#a855f7] to-[#0f66c9] transition-[transform,box-shadow,filter] duration-300 ease-out hover:brightness-[1.04] hover:shadow-[0_8px_26px_-12px_rgba(168,85,247,0.28)] hover:-translate-y-px active:translate-y-0 active:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      `Passer à ${plan.label}`
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {checkoutError && (
          <p className="text-amber-400 text-xs">{checkoutError}</p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
        >
          Plus tard
        </button>
      </div>
    </BaseModal>
  );
};

export default ClientLimitModal;
