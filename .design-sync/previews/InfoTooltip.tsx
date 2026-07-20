import { InfoTooltip } from 'poker-analyzer';

// InfoTooltip is an icon-only trigger; its tooltip reveals on hover/click and
// cannot render in a static screenshot. Compose it in a stat-row so the cell
// reads as real product context rather than a lone glyph.
const statRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  maxWidth: 260,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'var(--ink-2)',
  border: '1px solid var(--hairline)',
  fontFamily: 'var(--font-sans)',
};
const label: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--fg-dim)',
};

export const StatLabelWithTarget = () => (
  <div style={statRow}>
    <span style={label}>VPIP</span>
    <InfoTooltip text="Voluntarily Put In Pot — how often you enter the pot preflop." target="20-30%" />
  </div>
);

export const StatLabelPlain = () => (
  <div style={statRow}>
    <span style={label}>Fold to C-Bet</span>
    <InfoTooltip text="How often you fold to a continuation bet after calling preflop." />
  </div>
);
