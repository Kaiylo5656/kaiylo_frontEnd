import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Crown, CreditCard, Clock, Mail, ExternalLink, ArrowUpRight, Users, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/Toast';
import UpgradeConfirmationModal from '@/components/billing/UpgradeConfirmationModal';
import { buildApiUrl } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

const cardClass = 'bg-[rgba(24,24,27,0.25)] border border-white/10 rounded-2xl p-7 flex flex-col gap-5 transition-all duration-300 hover:scale-[1.02] hover:bg-white/6 hover:border-white/10 hover:shadow-[0_0_40px_-10px_rgba(212,132,90,0.6)]';

const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded-lg ${className}`} />
);

const SkeletonCard = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className={cardClass}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-4 w-28" />
        </div>
        <SkeletonBlock className="h-8 w-20" />
        <SkeletonBlock className="h-3 w-36" />
        <SkeletonBlock className="h-10 w-full rounded-xl" />
      </div>
    </Card>
  </motion.div>
);

const FacturationPage = () => {
  const { getAuthToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const fetchBillingStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/billing/status'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setBilling(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement');
      }
    } catch {
      setError('Impossible de charger les informations de facturation');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  // Detect ?upgraded=true after Stripe Checkout redirect
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      setShowSuccessToast(true);
      fetchBillingStatus();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, fetchBillingStatus]);

  const handleCheckout = useCallback(async () => {
    try {
      setCheckoutLoading(true);
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/billing/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success && result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        console.error('Checkout session error:', result);
        setError(result.error || 'Impossible de créer la session de paiement');
        setShowUpgradeModal(false);
      }
    } catch (err) {
      console.error('Checkout request failed:', err);
      setError('Erreur lors de la redirection vers le paiement');
      setShowUpgradeModal(false);
    } finally {
      setCheckoutLoading(false);
    }
  }, [getAuthToken]);

  const handleManageBilling = useCallback(async () => {
    try {
      setPortalLoading(true);
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/billing/create-portal-session'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success && result.data?.portalUrl) {
        window.location.href = result.data.portalUrl;
      } else {
        setError(result.error || 'Impossible de créer la session de gestion');
      }
    } catch {
      setError('Erreur lors de la redirection vers le portail de gestion');
    } finally {
      setPortalLoading(false);
    }
  }, [getAuthToken]);

  const isPro = billing?.plan === 'pro';
  const clientCount = billing?.clientCount ?? 0;
  const clientLimit = billing?.clientLimit ?? 3;
  const progressPercent = Math.min((clientCount / clientLimit) * 100, 100);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (error && !billing) {
    return (
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-8 tracking-tight">Facturation</h1>
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base">{error}</p>
            <button
              onClick={fetchBillingStatus}
              className="mt-6 px-6 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-foreground transition-all duration-300 hover:bg-white/5 hover:border-white/20"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10"
        >
          <h1 className="text-2xl md:text-3xl font-medium text-foreground tracking-tight">
            Facturation
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">
            Gérez votre abonnement et vos informations de paiement
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard delay={0} />
            <SkeletonCard delay={0.08} />
            <SkeletonCard delay={0.16} />
            <SkeletonCard delay={0.24} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={cardClass}>
                {/* Icon + Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D4845A] to-[#A05A3A]">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-medium text-[15px] text-foreground leading-tight">Mon Abonnement</h2>
                      <p className="text-xs text-muted-foreground mt-0.5 font-light">Plan actuel</p>
                    </div>
                  </div>
                  <Badge variant={isPro ? 'success' : 'default'}>
                    {isPro ? 'Actif' : 'Gratuit'}
                  </Badge>
                </div>

                {/* Plan name */}
                <div>
                  <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    {isPro ? 'Pro' : 'Free'}
                  </span>
                </div>

                {/* Client count bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-light">Clients actifs</span>
                    </div>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {clientCount}<span className="text-muted-foreground font-light">/{clientLimit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isPro
                          ? 'linear-gradient(90deg, #D4845A, #A05A3A)'
                          : progressPercent > 80
                            ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                            : 'linear-gradient(90deg, #D4845A, #bf7348)'
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                </div>

                {/* CTA */}
                {isPro ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    aria-busy={portalLoading}
                    className="w-full mt-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-foreground transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.16] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {portalLoading ? 'Chargement...' : 'Gérer mon abonnement'}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full mt-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Passer à Pro
                  </button>
                )}
              </Card>
            </motion.div>

            {/* Billing Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={cardClass}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                    <CreditCard className="h-5 w-5 text-foreground/70" />
                  </div>
                  <div>
                    <h2 className="font-medium text-[15px] text-foreground leading-tight">Détails de Facturation</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-light">Informations de paiement</p>
                  </div>
                </div>

                {isPro ? (
                  <div className="flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                        <span className="text-sm text-muted-foreground font-light">Montant</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">29€<span className="text-sm font-light text-muted-foreground">/mois</span></span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                        <span className="text-sm text-muted-foreground font-light">Période en cours</span>
                        <span className="text-sm font-medium text-foreground">{formatDate(billing?.currentPeriodEnd)}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-muted-foreground font-light">Statut</span>
                        <Badge variant="success">Actif</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground font-light leading-relaxed">
                      Aucun abonnement actif. Passez à Pro pour accéder à toutes les fonctionnalités et gérer jusqu'à 10 clients.
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* History Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={cardClass}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                    <Clock className="h-5 w-5 text-foreground/70" />
                  </div>
                  <div>
                    <h2 className="font-medium text-[15px] text-foreground leading-tight">Historique</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-light">Paiements et factures</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    {isPro
                      ? 'Consultez vos factures et l\'historique de vos paiements directement depuis le portail de gestion.'
                      : 'Aucun historique'}
                  </p>
                  {isPro && (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      aria-busy={portalLoading}
                      className="w-full mt-4 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-foreground transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.16] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {portalLoading ? 'Chargement...' : 'Voir l\'historique'}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Support Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={cardClass}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                    <Mail className="h-5 w-5 text-foreground/70" />
                  </div>
                  <div>
                    <h2 className="font-medium text-[15px] text-foreground leading-tight">Support</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-light">Besoin d'aide ?</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Une question sur votre abonnement ou votre facturation ? Notre équipe est là pour vous aider.
                  </p>
                  <a
                    href="mailto:support@kaiylo.com"
                    className="w-full mt-4 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-foreground transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.16] flex items-center justify-center gap-2"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    support@kaiylo.com
                  </a>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </div>

      {/* Upgrade Confirmation Modal */}
      <UpgradeConfirmationModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onConfirm={handleCheckout}
        isLoading={checkoutLoading}
      />

      {/* Success Toast */}
      <Toast
        message="Bienvenue sur Pro !"
        type="success"
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
};

export default FacturationPage;
