import { DataHealthAlertIcon } from 'poker-analyzer';

// Solid dark base (app canvas) so the light --fg title stays readable; severity
// reads from the border tint + the icon color. A translucent tint over the
// harness white bg would wash the title out.
const row: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  maxWidth: 420,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--hairline)',
  background: 'var(--ink-2)',
  fontFamily: 'var(--font-sans)',
};

export const DangerAlert = () => (
  <div style={{ ...row, borderColor: 'var(--loss-line)', boxShadow: 'inset 3px 0 0 var(--loss)' }}>
    <DataHealthAlertIcon isDanger={true} />
    <div>
      <p style={{ margin: 0, fontWeight: 700, color: 'var(--fg)', fontSize: 13 }}>
        142 hands failed to parse
      </p>
      <p style={{ margin: '2px 0 0', color: 'var(--fg-muted)', fontSize: 12, lineHeight: 1.4 }}>
        Corrupted PokerStars export — stats for this session may be incomplete.
      </p>
    </div>
  </div>
);

export const WarningAlert = () => (
  <div style={{ ...row, borderColor: 'var(--warn-line)', boxShadow: 'inset 3px 0 0 var(--warn)' }}>
    <DataHealthAlertIcon isDanger={false} />
    <div>
      <p style={{ margin: 0, fontWeight: 700, color: 'var(--fg)', fontSize: 13 }}>
        Small sample: 84 hands
      </p>
      <p style={{ margin: '2px 0 0', color: 'var(--fg-muted)', fontSize: 12, lineHeight: 1.4 }}>
        Villain archetypes stay tentative until 100+ hands are tracked.
      </p>
    </div>
  </div>
);
