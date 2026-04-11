import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Clock, ExternalLink, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/Toast';
import UpgradeConfirmationModal from '@/components/billing/UpgradeConfirmationModal';
import { buildApiUrl } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

const cardClass = 'bg-white/[0.03] border border-white/10 rounded-2xl p-7 flex flex-col gap-5 h-full md:min-h-[282px]';

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
  const isOverClientLimit = clientCount > clientLimit;
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
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={`${cardClass} group transition-colors duration-300 hover:bg-white/[0.10]`}>
                {/* Icon + Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 576 512"
                      className="h-8 w-8 shrink-0 text-[#D4845A] transition-colors duration-300 group-hover:text-[#E8A078]"
                      aria-hidden="true"
                      fill="currentColor"
                    >
                      <path d="M313 87.2c9.2-7.3 15-18.6 15-31.2 0-22.1-17.9-40-40-40s-40 17.9-40 40c0 12.6 5.9 23.9 15 31.2L194.6 194.8c-10 15.7-31.3 19.6-46.2 8.4L88.9 158.7c4.5-6.4 7.1-14.3 7.1-22.7 0-22.1-17.9-40-40-40s-40 17.9-40 40c0 21.8 17.5 39.6 39.2 40L87.8 393.5c4.7 31.3 31.6 54.5 63.3 54.5l273.8 0c31.7 0 58.6-23.2 63.3-54.5L520.8 176c21.7-.4 39.2-18.2 39.2-40 0-22.1-17.9-40-40-40s-40 17.9-40 40c0 8.4 2.6 16.3 7.1 22.7l-59.4 44.6c-14.9 11.2-36.2 7.3-46.2-8.4L313 87.2z" />
                    </svg>
                    <div>
                      <h2 className="font-medium text-base text-[#D4845A] leading-tight transition-colors duration-300 group-hover:text-[#E8A078]">
                        Mon Abonnement
                      </h2>
                    </div>
                  </div>
                  <Badge variant={isPro ? 'success' : 'default'}>
                    {isPro ? 'Actif' : 'Gratuit'}
                  </Badge>
                </div>

                {/* Plan name */}
                <div>
                  <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    {isPro ? 'Pro' : 'Gratuit'}
                  </span>
                </div>

                {/* Client count bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 576 512"
                        className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                        aria-hidden="true"
                        fill="currentColor"
                      >
                        <path d="M64 128a112 112 0 1 1 224 0 112 112 0 1 1 -224 0zM0 464c0-97.2 78.8-176 176-176s176 78.8 176 176l0 6c0 23.2-18.8 42-42 42L42 512c-23.2 0-42-18.8-42-42l0-6zM432 64a96 96 0 1 1 0 192 96 96 0 1 1 0-192zm0 240c79.5 0 144 64.5 144 144l0 22.4c0 23-18.6 41.6-41.6 41.6l-144.8 0c6.6-12.5 10.4-26.8 10.4-42l0-6c0-51.5-17.4-98.9-46.5-136.7 22.6-14.7 49.6-23.3 78.5-23.3z" />
                      </svg>
                      <span className="text-xs text-muted-foreground font-normal">Clients actifs</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      <span className={isOverClientLimit ? 'text-red-500' : 'text-foreground'}>
                        {clientCount}
                      </span>
                      <span className="text-muted-foreground font-light">/{clientLimit}</span>
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
                    className="w-full mt-1 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512"
                      className="h-3.5 w-3.5 shrink-0"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z" />
                    </svg>
                    Passer à Pro
                  </button>
                )}
              </Card>
            </motion.div>

            {/* Billing Details Card */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={`${cardClass} group transition-colors duration-300 hover:bg-white/[0.10]`}>
                <div className="flex items-center gap-3.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-6 w-6 text-white/50 transition-colors duration-300 group-hover:text-white" fill="currentColor" aria-hidden="true">
                    <path d="M0 128l0 32 512 0 0-32c0-35.3-28.7-64-64-64L64 64C28.7 64 0 92.7 0 128zm0 80L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-176-512 0zM64 360c0-13.3 10.7-24 24-24l48 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-48 0c-13.3 0-24-10.7-24-24zm144 0c0-13.3 10.7-24 24-24l64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0c-13.3 0-24-10.7-24-24z" />
                  </svg>
                  <div>
                    <h2 className="font-light text-base text-white/50 leading-tight transition-colors duration-300 group-hover:text-white">Détails de Facturation</h2>
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
                  <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0">
                    <p className="text-sm text-white/25 font-light leading-relaxed">
                      Aucun abonnement actif
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* History Card */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={`${cardClass} group transition-colors duration-300 hover:bg-white/[0.10]`}>
                <div className="flex items-center gap-3.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-6 w-6 text-white/50 transition-colors duration-300 group-hover:text-white" fill="currentColor" aria-hidden="true">
                    <path d="M288 64c106 0 192 86 192 192S394 448 288 448c-65.2 0-122.9-32.5-157.6-82.3-10.1-14.5-30.1-18-44.6-7.9s-18 30.1-7.9 44.6C124.1 468.6 201 512 288 512 429.4 512 544 397.4 544 256S429.4 0 288 0C202.3 0 126.5 42.1 80 106.7L80 80c0-17.7-14.3-32-32-32S16 62.3 16 80l0 112c0 17.7 14.3 32 32 32l24.6 0c.5 0 1 0 1.5 0l86 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-38.3 0C154.9 102.6 217 64 288 64zm24 88c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 104c0 6.4 2.5 12.5 7 17l72 72c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-65-65 0-94.1z" />
                  </svg>
                  <div>
                    <h2 className="font-light text-base text-white/50 leading-tight transition-colors duration-300 group-hover:text-white">Historique de paiement</h2>
                  </div>
                </div>

                {isPro ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <p className="text-sm text-muted-foreground font-light leading-relaxed">
                      Consultez vos factures et l&apos;historique de vos paiements directement depuis le portail de gestion.
                    </p>
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      aria-busy={portalLoading}
                      className="w-full mt-4 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-foreground transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.16] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {portalLoading ? 'Chargement...' : 'Voir l\'historique'}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0">
                    <p className="text-sm text-white/25 font-light leading-relaxed">
                      Aucun historique
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Support Card */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Card className={`${cardClass} group transition-colors duration-300 hover:bg-white/[0.10]`}>
                <div className="flex items-center gap-3.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-6 w-6 text-white/50 transition-colors duration-300 group-hover:text-white" fill="currentColor" aria-hidden="true">
                    <path d="M224 64c-79 0-144.7 57.3-157.7 132.7 9.3-3 19.3-4.7 29.7-4.7l16 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-16 0c-53 0-96-43-96-96l0-64C0 100.3 100.3 0 224 0S448 100.3 448 224l0 168.1c0 66.3-53.8 120-120.1 120l-87.9-.1-32 0c-26.5 0-48-21.5-48-48s21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 0 40 0c39.8 0 72-32.2 72-72l0-20.9c-14.1 8.2-30.5 12.8-48 12.8l-16 0c-26.5 0-48-21.5-48-48l0-96c0-26.5 21.5-48 48-48l16 0c10.4 0 20.3 1.6 29.7 4.7-13-75.3-78.6-132.7-157.7-132.7z" />
                  </svg>
                  <div>
                    <h2 className="font-light text-base text-white/50 leading-tight transition-colors duration-300 group-hover:text-white">Support</h2>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">
                    Une question sur votre abonnement ou votre facturation ? Notre équipe est là pour vous aider.
                  </p>
                  <a
                    href="mailto:support@kaiylo.com"
                    className="w-full mt-4 py-2.5 rounded-xl bg-white/[0.05] text-sm font-medium text-[var(--kaiylo-primary-hex)] transition-all duration-300 hover:bg-white/[0.08] hover:text-[var(--kaiylo-primary-hover)] flex items-center justify-center"
                  >
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
