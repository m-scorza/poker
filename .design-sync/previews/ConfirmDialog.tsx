import { ConfirmDialog, MotionGlobalConfig } from 'poker-analyzer';

// The static capture freezes the clock, so framer-motion enter animations
// (initial opacity:0) never settle. skipAnimations jumps them straight to
// their target state. Must be the barrel's re-export (same framer instance as
// the bundled component) — importing framer-motion directly hits a separate copy.
MotionGlobalConfig.skipAnimations = true;

const noop = () => {};

// The dialog renders a `fixed inset-0` overlay that centers against the
// nearest transformed ancestor — this frame makes it center inside the card
// cell instead of escaping to the page viewport.
const Frame = ({ children }: { children?: unknown }) => (
  <div style={{ transform: 'translateZ(0)', position: 'relative', height: 440, background: 'var(--ink)' }}>
    {children as any}
  </div>
);

export const DeleteHands = () => (
  <Frame>
  <ConfirmDialog
    isOpen={true}
    variant="danger"
    title="Delete 1,204 hands?"
    description="This permanently removes every hand in the current session filter. Starred hands and notes cannot be recovered."
    confirmLabel="Delete hands"
    cancelLabel="Keep hands"
    onConfirm={noop}
    onCancel={noop}
  />
  </Frame>
);

export const ClearVillainNotes = () => (
  <Frame>
  <ConfirmDialog
    isOpen={true}
    variant="warning"
    title="Reset villain tags?"
    description="This clears all manual archetype tags and notes for 42 tracked opponents. Auto-classification will re-run on the next import."
    confirmLabel="Reset tags"
    onConfirm={noop}
    onCancel={noop}
  />
  </Frame>
);

export const ReimportSession = () => (
  <Frame>
  <ConfirmDialog
    isOpen={true}
    variant="info"
    title="Re-import this session?"
    description="We will re-parse the original hand history and rebuild derived stats. Existing analysis for these 318 hands will be replaced."
    confirmLabel="Re-import"
    cancelLabel="Not now"
    onConfirm={noop}
    onCancel={noop}
  />
  </Frame>
);
