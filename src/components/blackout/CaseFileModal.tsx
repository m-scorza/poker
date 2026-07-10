import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import { useFocusTrap } from './useFocusTrap';

export type CaseFileSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CaseFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  title?: string;
  side?: 'left' | 'right';
  severity?: CaseFileSeverity | null;
  ribbonLabel?: string;
  children: ReactNode;
}

export function CaseFileModal({
  isOpen,
  onClose,
  fileId,
  title,
  side = 'right',
  severity,
  ribbonLabel,
  children,
}: CaseFileModalProps) {
  const reduceMotion = useReducedMotion();
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const offset = side === 'right' ? '100%' : '-100%';
  const panelVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { x: offset }, animate: { x: 0 }, exit: { x: offset } };
  const ribbon = severity ? (ribbonLabel ?? severity.toUpperCase()) : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={clsx('bk-modal-root', `bk-modal-anchor-${side}`)} role="presentation">
          <motion.div
            className="bk-modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={`File ${fileId}`}
            className={clsx('bk-modal-panel', `bk-modal-${side}`)}
            data-sev={severity ?? undefined}
            data-ribbon={ribbon}
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.2 : 0.3, ease: [0.6, 0, 0.2, 1] }}
          >
            <header className="bk-modal-head">
              <span className="bk-modal-file">FILE · {fileId}</span>
              {severity && (
                <span className="bk-modal-sevtag" data-sev={severity}>
                  {ribbon}
                </span>
              )}
              <button
                type="button"
                className="bk-modal-close"
                onClick={onClose}
                aria-label="Close file"
              >
                ✕
              </button>
            </header>
            {title && <h2 className="bk-modal-title">{title}</h2>}
            <div className="bk-modal-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
