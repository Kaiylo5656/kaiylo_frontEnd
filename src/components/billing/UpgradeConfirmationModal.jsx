import BaseModal from '@/components/ui/modal/BaseModal';
import { Zap, Users, Video, Headphones, Loader2 } from 'lucide-react';

const benefits = [
  { icon: Users, text: "Jusqu'à 10 clients" },
  { icon: Video, text: 'Rétention vidéo 6 mois' },
  { icon: Headphones, text: 'Support prioritaire' },
];

const UpgradeConfirmationModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Passer à Pro"
      modalId="upgrade-confirmation"
      size="sm"
    >
      <div className="flex flex-col gap-6">
        {/* Price */}
        <div className="text-center">
          <span className="text-4xl font-bold text-white">€29</span>
          <span className="text-lg text-zinc-400 font-light">/mois</span>
        </div>

        {/* Benefits */}
        <ul className="space-y-3">
          {benefits.map((benefit) => (
            <li key={benefit.text} className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
                <benefit.icon className="h-4 w-4 text-purple-400" />
              </div>
              {benefit.text}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onConfirm}
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
                Continuer
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-white hover:bg-white/5"
          >
            Annuler
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default UpgradeConfirmationModal;
