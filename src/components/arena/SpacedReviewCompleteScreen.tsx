import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface SpacedReviewCompleteScreenProps {
  score: { correct: number; total: number };
  onDismiss: () => void;
}

export function SpacedReviewCompleteScreen({ score, onDismiss }: SpacedReviewCompleteScreenProps) {
  return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-block p-3 border border-[var(--money-line)] bg-[var(--money-soft)] rounded-2xl mb-4"
      >
        <CheckCircle2 size={40} className="text-[var(--money)]" />
      </motion.div>
      <span className="kick sig block mb-2">Spaced Review</span>
      <h1 className="text-4xl font-bold text-[var(--fg)] mb-2">Session complete.</h1>
      <p className="lede text-[var(--fg-dim)] mb-8">
        You drilled {score.total} {score.total === 1 ? 'pattern' : 'patterns'} —{' '}
        {score.correct} correct. Misses come back soon; the rest are scheduled further out.
      </p>
      <button type="button" className="btn sig px-8 py-3" onClick={onDismiss}>
        Back to the Arena
      </button>
    </div>
  );
}
