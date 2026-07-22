import { CommandPalette, MotionGlobalConfig } from 'poker-analyzer';

// Static capture freezes the clock; skipAnimations jumps framer-motion enter
// animations to their target so the open palette is visible. Barrel re-export
// only (same framer instance as the bundled component).
MotionGlobalConfig.skipAnimations = true;

// Single-card mode (640x480). Rendered open; it pulls the real NAV_ITEMS
// registry, so the list shows the product's actual destinations. useNavigate
// is satisfied by the global MemoryRouter provider (config), not wired here.
// NOTE: CommandPalette animates in via framer-motion AnimatePresence
// (initial opacity:0). The static capture harness freezes the clock and never
// waits for an animation frame, so the enter animation may not settle — see
// WAVE2.md (blocker CD-1). Content/props are correct regardless.
const noop = () => {};

export const Open = () => (
  <CommandPalette open={true} onOpenChange={noop} />
);
