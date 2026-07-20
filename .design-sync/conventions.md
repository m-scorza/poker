# Poker Analyzer UI — build conventions

Dark-first analytics UI ("INK MONO"): near-black canvas, silver interactive accents, semantic green/red money colors, violet reserved for user-presence moments. All 8 components render on dark surfaces.

## Setup

- No provider is required for PokerCard, StatCard, InfoTooltip, ConfirmDialog, RangeGrid, DualRangeMatrix, or DataHealthAlertIcon.
- `CommandPalette` uses react-router navigation — wrap it (or your app root) in the exported `MemoryRouter`: `<MemoryRouter><CommandPalette …/></MemoryRouter>`. Without it, it throws on mount.
- `MotionGlobalConfig` is an internal capture escape hatch — never use it in designs (it disables all framer-motion animation).
- The page background is `var(--color-ink)` (#0a0a0c) via the stylesheet; don't place components on white.

## Styling idiom — CSS variables, not new utility classes

The stylesheet is **compiled** Tailwind output: only classes the source app actually used exist. Do NOT invent Tailwind-style classes (`bg-emerald-500`, `p-6`, arbitrary values) — most will silently not resolve. Style your own layout glue with inline styles or plain CSS using the design tokens:

| Token | Use |
|---|---|
| `--color-ink` / `--ink-2` / `--color-ink-3` | canvas / compartment / hover surface |
| `--fg` / `--fg-muted` / `--fg-dim` | text hierarchy |
| `--money` / `--money-soft` / `--money-line` | positive money (always green) |
| `--loss` / `--loss-soft` / `--loss-line` | losses / danger |
| `--warn` / `--warn-soft` / `--warn-line` | warnings (dusty rose — never yellow) |
| `--sig` / `--sig-soft` / `--sig-line` | violet signature: focus/selection/user-presence ONLY |
| `--accent` / `--accent-soft` / `--accent-line` | silver interactive accents |
| `--hairline` / `--hairline-strong` | borders (white at 7% / 16%) |
| `--color-heart` `--color-diamond` `--color-club` `--color-spade` | 4-color deck (red/blue/green/white) |
| `--font-display` / `--font-sans` / `--font-mono` | Bricolage Grotesque / Inter / JetBrains Mono |
| `--radius-sm|md|lg` | 6/8/10px |
| `--s-2xs…--s-3xl`, `--t-cap…--t-display` | spacing (4–40px) and type scale (9–34px) |

Shipped semantic classes that DO exist and should be reused: `compartment` (tone-shift card surface, no border), `compartment-hover`, `kicker` (mono 10px uppercase tracked label — the UI's connective tissue), `rule` (hairline top border), `jewel` (the one glowing hero card — budget: 1 per screen), `dots` (fixed dot-grid backdrop). Numbers always get `font-family: var(--font-mono)` with tabular figures.

## Where the truth lives

Read `styles.css` → `_ds_bundle.css` (all tokens at `:root`, component CSS, font faces) before styling. Per-component API: `components/general/<Name>/<Name>.d.ts`; usage: `<Name>.prompt.md`.

## Idiomatic example

```jsx
<div style={{ background: 'var(--color-ink)', padding: 'var(--s-xl)', minHeight: '100vh' }}>
  <p className="kicker">Session review</p>
  <div style={{ display: 'flex', gap: 'var(--s-sm)', marginTop: 'var(--s-md)' }}>
    <StatCard label="NET PROFIT" value="+$1,204.50" subtext="18 sessions" accent="green" />
    <StatCard label="VPIP" value="24.3%" accent="info" info={{ text: 'Voluntary money in pot', target: '20-30%' }} />
  </div>
  <div className="compartment" style={{ padding: 'var(--s-md)', marginTop: 'var(--s-md)', display: 'flex', gap: 8 }}>
    <PokerCard card="Ah" size="lg" /> <PokerCard card="Kd" size="lg" /> <PokerCard card="back" size="lg" />
  </div>
</div>
```
