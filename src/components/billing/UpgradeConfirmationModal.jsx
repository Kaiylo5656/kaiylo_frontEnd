import BaseModal from '@/components/ui/modal/BaseModal';
import { Loader2 } from 'lucide-react';

const clientsIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 576 512"
    className="h-4 w-4 shrink-0 text-purple-400"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M64 128a112 112 0 1 1 224 0 112 112 0 1 1 -224 0zM0 464c0-97.2 78.8-176 176-176s176 78.8 176 176l0 6c0 23.2-18.8 42-42 42L42 512c-23.2 0-42-18.8-42-42l0-6zM432 64a96 96 0 1 1 0 192 96 96 0 1 1 0-192zm0 240c79.5 0 144 64.5 144 144l0 22.4c0 23-18.6 41.6-41.6 41.6l-144.8 0c6.6-12.5 10.4-26.8 10.4-42l0-6c0-51.5-17.4-98.9-46.5-136.7 22.6-14.7 49.6-23.3 78.5-23.3z" />
  </svg>
);

const videoRetentionIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 576 512"
    className="h-4 w-4 shrink-0 text-purple-400"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z" />
  </svg>
);

const supportPriorityIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    className="h-4 w-4 shrink-0 text-purple-400"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M224 64c-79 0-144.7 57.3-157.7 132.7 9.3-3 19.3-4.7 29.7-4.7l16 0c26.5 0 48 21.5 48 48l0 96c0 26.5-21.5 48-48 48l-16 0c-53 0-96-43-96-96l0-64C0 100.3 100.3 0 224 0S448 100.3 448 224l0 168.1c0 66.3-53.8 120-120.1 120l-87.9-.1-32 0c-26.5 0-48-21.5-48-48s21.5-48 48-48l32 0c26.5 0 48 21.5 48 48l0 0 40 0c39.8 0 72-32.2 72-72l0-20.9c-14.1 8.2-30.5 12.8-48 12.8l-16 0c-26.5 0-48-21.5-48-48l0-96c0-26.5 21.5-48 48-48l16 0c10.4 0 20.3 1.6 29.7 4.7-13-75.3-78.6-132.7-157.7-132.7z" />
  </svg>
);

const makeBenefits = (studentLimit) => [
  { customIcon: clientsIcon, text: `Jusqu'à ${studentLimit} clients` },
  { customIcon: videoRetentionIcon, text: 'Rétention vidéo 6 mois' },
  { customIcon: supportPriorityIcon, text: 'Support prioritaire' },
];

const upgradeTitleIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    className="h-5 w-5 shrink-0"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z" />
  </svg>
);

const DEFAULT_PLAN = { name: 'starter', label: 'Starter', price: 29, studentLimit: 10 };

const UpgradeConfirmationModal = ({ isOpen, onClose, onConfirm, isLoading, plan = DEFAULT_PLAN }) => {
  const benefits = makeBenefits(plan.studentLimit);
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Passer à ${plan.label}`}
      titleIcon={upgradeTitleIcon}
      modalId="upgrade-confirmation"
      size="sm"
      className="!min-w-0 w-full !max-w-[min(25rem,calc(100vw-2rem))]"
    >
      <div className="flex flex-col gap-6">
        {/* Price */}
        <div className="text-center mt-1.5 mb-1.5">
          <span className="text-4xl font-bold text-white">€{plan.price}</span>
          <span className="text-lg text-zinc-400 font-light">/mois</span>
        </div>

        {/* Benefits */}
        <ul className="space-y-3 mt-1.5 mb-1.5">
          {benefits.map((benefit) => (
            <li key={benefit.text} className="flex items-center gap-3 text-sm text-zinc-300">
              {benefit.customIcon ? (
                <span className="inline-flex w-8 shrink-0 items-center justify-center">{benefit.customIcon}</span>
              ) : null}
              {benefit.text}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-3 rounded-[8px] text-sm font-semibold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-[#a855f7] to-[#0f66c9] transition-[transform,box-shadow,filter] duration-300 ease-out hover:brightness-[1.04] hover:shadow-[0_8px_26px_-12px_rgba(168,85,247,0.28)] hover:-translate-y-px active:translate-y-0 active:brightness-[1.02] active:shadow-[0_4px_18px_-10px_rgba(15,102,201,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              'Continuer'
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
          >
            Annuler
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default UpgradeConfirmationModal;
