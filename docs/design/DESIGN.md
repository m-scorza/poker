# DESIGN.md — Poker Analyzer design system

The contract for building UI in the poker repo. Decisions and their reasons live in
`DECISIONS.md`; this file is the *how*. The pixel reference is
`design-system/reference/Command Desk R.html` + `reinterpretation.css` — when prose and pixels disagree,
pixels win until a human says otherwise. Tokens ship in `tokens.css` (Tailwind 4 `@theme`).

## Identity in one paragraph

A precision instrument for poker study. Quiet near-black chassis, silver type, structure drawn
with hairlines and tone shifts instead of boxes and glow. Color is meaning: green is money won,
red is money lost, amber is caution, violet is *you* — your cursor, your focus, your position in
the app. One jewel per screen is allowed to shine. The poker objects themselves — cards, felt,
the 13×13 matrix, the equity curve — are the visual signature, treated with craft instead of neon.

## Foundations

### Color

| Token | Value | Role |
|---|---|---|
| `bg` | `#0a0a0c` | App canvas |
| `bg-2` | `#111114` | Compartment tone shift, panels |
| `bg-3` | `#16161a` | Hover tone, inputs `#131316` |
| `border` | `rgba(255,255,255,0.07)` | Hairlines (internal structure) |
| `border-strong` | `rgba(255,255,255,0.16)` | Emphasized rules, control borders |
| `fg` | `#f2f2f4` | Primary type |
| `fg-muted` | `#8b8d94` | Secondary type, labels |
| `fg-dim` | `#56585f` | Tertiary, disabled |
| `accent` | `#C9CDD6` | Silver — interactive at rest |
| `money` | `#34D98C` | Positive money. ALWAYS green. May glow (jewel only) |
| `loss` | `#FF5468` | Negative money, critical leaks (pulse allowed) |
| `warn` | `#A5697B` | Warning = loss a full intensity stop down (faded mauve-rose, no pulse, label `REVIEW`) |
| `sig` | `#9B6CFF` | The violet signature (rules below) |
| `felt` | `#121215` / rail `#1c1c21` | Poker felt surfaces |

Each semantic color has `-soft` (≈8–10% alpha fill) and `-line` (≈36–40% alpha stroke) variants —
use those for fills/strokes, never hand-rolled alphas.

### The violet signature — hard rules

Violet appears at user-presence and wayfinding points, nowhere else:
cursor halo · text selection · focus rings · live pulse · active nav tick (2px inset) ·
active tab underline (2px inset) · breadcrumb current · CTA arrow glyphs · loader.
Violet never appears on: surfaces, resting borders, chart lines, data values, body text, icons.
If a new use feels tempting, it's wayfinding or it's rejected.

### Typography

- `font-display`: **Bricolage Grotesque** — monument numbers, page titles, card titles, verdicts.
- `font-sans`: **Inter** — everything readable.
- `font-mono`: **JetBrains Mono** — all numerals, kickers, table data, meta lines.

Treatment rules (these carry the identity):

1. Scale contrast is the drama: monument `clamp(64px, 8vw, 108px)` w800 against 9–11px labels.
2. Display tracking tight: `-0.03em` to `-0.05em` at large sizes.
3. **Kicker system**: every section label is uppercase mono, 9–11px, letter-spacing `0.12–0.2em`,
   `fg-muted`. This is the connective tissue of the whole UI.
4. `font-variant-numeric: tabular-nums` globally — columns never shimmer.
5. Body stays 13–14px; density is a feature, not a bug.

### Space, radius, elevation

4px-base spacing scale (`4/8/12/16/20/24/32/40/48/64`). Radii: `3/6/8/10` — compartments use 8–10px,
controls 6px. Shadows exist only for floating layers (dock, command palette, tooltips:
`0 10px 36px rgba(0,0,0,0.45)`); compartments have none.

## Surface model

- Compartment = tone shift `bg → bg-2`, **no border**, radius 8–10px, no blur, no glass.
- Hover = one tone lighter (`bg-3`). No shadow lift, no glow.
- Internal structure = 1px hairlines (`border`), v7 style: `border-top` between sub-sections,
  hairline-divided metric grids.
- **The jewel budget: exactly one element per screen** may use glass + glow (gradient fill,
  `backdrop-blur`, soft colored shadow). On the Desk: the sidebar lifetime-profit block, glowing
  green because it's money. A second jewel demotes the first — choose.
- Sidebar: flat `bg`, hairline right edge. Floating chrome (dock, ⌘K palette) may keep blur — it
  floats above the page, it's not a compartment.

## Range matrix encoding (13×13)

The most important poker surface. Monochrome frequency encoding, one verdict color:

- **In range**: solid fill — `color-mix(in srgb, accent 26%, ink-2)`, `accent-line` border, `fg` label.
- **Mixed**: same hue, **half fill** (135° gradient split action/fold), dashed `accent-line`
  border, `fg-muted` label. Mixed is a frequency, drawn literally — never a third hue.
- **Leaking**: `loss-soft` fill, `loss` border + label, slow pulse (the one data animation).
- **Fold**: `rgba(255,255,255,0.015)`, transparent border, `fg-dim` label.
- Yellow never appears in the matrix (alerts only). Violet never appears in the matrix (D3).

## Background

Static dot grid: 1px dots, `rgba(255,255,255,0.035)`, 28px spacing, radial mask fading to nothing
by mid-page. No animation by default. The animated point-mesh is a future opt-in setting with a
visible toggle, never the default render path.

## The cursor halo (identity element)

10px ring, `1px solid sig-line`, `sig-soft` fill, no blend mode. Fades in on movement.
Roadmap — the halo becomes *behavioral*: magnetic pull toward buttons/links, gentle expansion over
data points (chart dots, matrix cells), snap-to-cell inside the 13×13 grid. Build in Motion on
port. Constraints: ≤14px at rest, no trails, no glow stacking, hidden on touch devices and under
`prefers-reduced-motion`.

## Motion system

Engines: **Motion** (layout transitions, presence, entrance sequences) and **GSAP** (timeline-driven
SVG draw-ins, count-ups, staggered reveals). Both are first-class dependencies. CSS for
micro-interactions (≤200ms color/tone). See DECISIONS D10.

Budget per screen — about five moments, all functional:

1. Entry choreography: reveal stagger, 60–140ms steps, `cubic-bezier(.2,.7,.2,1)`.
2. Hero count-up: ease-out-quart ≈1.3s, tabular nums so layout never jumps.
3. Chart draw-in: stroke-dash, ≈1.4s, dot+label pop at the end.
4. Hover micro: tone shift / 2px slide, 120–160ms.
5. The live pulse (wire ticker) — the only looping animation on the page.

Everything respects `prefers-reduced-motion` (state applied instantly, loops off). Browser-paused
rAF (hidden tabs) is expected behavior, not a bug.

## Performance budget

- Zero always-on canvas/WebGL on the default path.
- `backdrop-filter`: floating chrome + the jewel only — never stacked compartments.
- Loops: the pulse, nothing else. Infinite tickers pause on hover and under reduced motion.

## Porting map (lab → product)

Priority order, from CURATION.md's CORE/WIRE verdicts — port *into real pages*, never into a catalog:

1. **Tokens + chassis** (this package) → Tailwind theme, app shell, sidebar, kicker components.
2. **Desk instruments**: verdict gauge, monument w/ equity curve, ring HUD, positional felt ring,
   alert log — reference implementations all live in Command Desk R.
3. **Range matrix (13×13)** — the single most important poker surface (Ranges + leak panels).
4. **WIRE set**: toast stack, ⌘K palette, tooltip/popover, skeleton shimmer, drawer, import
   progress (replaces the app's current loader).
5. **Hand-replay felt** — modal, Motion timeline.
6. Behavioral halo — last, it's polish.

GSAP and Motion serve different primitives — use whichever fits the animation model, not habit.

## Anti-patterns (instant review rejections)

Violet gradients as decoration · outlined cards · glow on borders or chart strokes · a second
jewel · new accent hues · non-tabular numerals in data · Space-for-impact animations with no
function · adding a theme/palette option · building a component without a page that needs it.
