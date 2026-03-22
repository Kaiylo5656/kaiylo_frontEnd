import { useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const Toast = ({ message, type = 'success', duration = 5000, onClose, isVisible }) => {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`fixed z-50 bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-auto ${
            type === 'success'
              ? 'bg-emerald-500/90'
              : type === 'warning'
                ? 'bg-amber-500/90'
                : 'bg-blue-500/90'
          } text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3`}
        >
          {type === 'success' && <CheckCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Toast };
