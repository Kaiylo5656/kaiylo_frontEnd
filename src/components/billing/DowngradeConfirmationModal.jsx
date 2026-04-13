import { X, AlertTriangle } from 'lucide-react';

/**
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => void  (opens Customer Portal)
 * - targetPlan: { name, label, price, studentLimit }
 * - studentsToDeactivate: Array<{ id, name }> — students who will lose access
 * - isLoading: boolean
 */
export default function DowngradeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  targetPlan,
  studentsToDeactivate = [],
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Passer au plan {targetPlan?.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {targetPlan?.studentLimit} élèves max · €{targetPlan?.price}/mois
            </p>
          </div>
        </div>

        {/* Warning message */}
        {studentsToDeactivate.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold text-orange-600">{studentsToDeactivate.length} élève{studentsToDeactivate.length > 1 ? 's' : ''}</span> perdront l'accès à la plateforme lors du changement :
            </p>
            <ul className="bg-muted/50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {studentsToDeactivate.map((student) => (
                <li key={student.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  {student.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-6">
          Cette action prendra effet à la fin de votre période de facturation actuelle. Vous pourrez toujours réactiver ces élèves en passant à un plan supérieur.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Chargement...' : 'Confirmer et changer de plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
