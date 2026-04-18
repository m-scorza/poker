import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header / Icon */}
            <div className={clsx(
              "p-6 flex flex-col items-center text-center",
              variant === 'danger' && "bg-red-500/10",
              variant === 'warning' && "bg-amber-500/10",
              variant === 'info' && "bg-blue-500/10"
            )}>
              <div className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                variant === 'danger' && "bg-red-500/20 text-red-500",
                variant === 'warning' && "bg-amber-500/20 text-amber-500",
                variant === 'info' && "bg-blue-500/20 text-blue-500"
              )}>
                <AlertTriangle size={24} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Footer / Actions */}
            <div className="p-4 bg-black/20 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={clsx(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
                  variant === 'danger' && "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20",
                  variant === 'warning' && "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20",
                  variant === 'info' && "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                )}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
