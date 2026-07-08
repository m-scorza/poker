# DECISIONS.md — Poker Analyzer design direction

**Ratified by:** Matheus (scorza23) · **Date:** 2026-06-09
**Visual reference:** `design-system/reference/Command Desk R.html` — this page IS the decision record in pixel form.
**Destination:** copy this file + `DESIGN.md` + `tokens.css` into the poker repo at `docs/design/`.

These decisions were made by comparing real alternatives on real screens, not in the abstract.
They are settled. Re-opening one requires a written reason for why the original rationale failed —
not a mood. This file exists because the previous process produced 10 palettes, 49 bricks, and
zero commitments.

---

## D1 · Positioning

**The first poker tool that looks like it was designed.** Instrument-serious chassis
(Linear/Vercel discipline), with a small set of owned signatures. Two explicit refusals:

- **Poker-tool ugly** (GTO Wizard, Hand2Note): rainbow stat soup, no type system. Rejected.
- **AI slop generic** (Inter + violet gradients + rounded glowing cards): what no-decisions
  looks like. Rejected — we built it on purpose (`direction-lab/0-slop.html`) to know its face.

## D2 · Palette: INK MONO, dark-first

Neutral near-black chassis (`#0a0a0c` / `#111114`), white-silver type, **silver** as the
interactive accent. Chromatic color appears only where it carries meaning (D4, D5).

- Rejected after side-by-side trial: ultraviolet-as-environment (heart pick, lost to business
  head), glacier cyan (original identity, kept losing to ink), tungsten ember ("trash" — too warm),
  flat black/white editorial (no shine), and the entire 10-theme roulette, which is deleted as a
  concept. **A product has one palette.**
- **Light mode: parked, not designed.** Dark is the product. Light returns as its own project.

## D3 · The violet signature

Violet `#9B6CFF` survives as the **signature hue**, used ONLY at user-presence and wayfinding
points: cursor halo, text selection, focus rings, the live pulse, active nav tick, active tab
underline, breadcrumb current, CTA arrows, loader. Never on surfaces, borders-at-rest, charts,
or data. Rationale: resolves "heart says violet, brain says mono" — the sober chassis is the
product; violet marks *where you are and where you act*.

## D4 · Data semantics — alive on a quiet field

- **Money-positive is ALWAYS green** — `#34D98C` — across every present and future theme.
  "You're up" is the brand signal. (Inherited from poker 4 `tokens.css`, made canon.)
- Loss `#FF5468`, warn `#E0AC4E`. Semantics are deliberately more saturated than the chassis —
  they pop *because* everything else is quiet.

## D5 · Surface model — v7 tone shifts, one jewel

- Compartments are **tone shifts** (`bg → bg-2`), `border: 0`, no glass, no blur, no outlines.
- Internal structure is drawn with **1px hairlines** (`--border`), not boxes.
- Decorative glow is dead: no text-shadows on numbers, no glowing borders, no hover halos.
- **Exception — the jewel.** One element per screen may keep glass + glow. On the Desk it's the
  sidebar lifetime-profit block (green money-glow). The jewel budget is exactly 1.

## D6 · Background

Static dot grid, very quiet (`rgba(255,255,255,0.035)`, 28px, radial mask). Glow orbs deleted.
The animated point-mesh (old lab) remains a future *opt-in* option, never default — it's the one
always-on GPU cost.

## D7 · The cursor halo — the identity element

10px violet ring. Kept precisely because everything else got quieter. Roadmap (not yet built):
**behavioral halo** — magnetic toward actionable elements, expands over data points, snaps to
13×13 matrix cells. Identity through interaction, not decoration. It must never grow past ~14px
or regain mix-blend glow.

## D8 · Retired effects (the aging set)

3D tilt, glowing/shiny borders, radar sweep, shader-bg (WebGL), cyber buttons, cursor trails,
split-flap counters. Verdict: effects age; instruments don't. The poker-native instruments
(verdict gauge, range matrix, felt ring, equity curve, chip stacks) are the signature layer instead.

## D9 · Typography: HYBRID

- **Display:** Bricolage Grotesque (monument, page titles, card titles) — the voice.
- **Body:** Inter — invisible at paragraph and table sizes.
- **Data/labels:** JetBrains Mono — tabular numerals everywhere, uppercase wide-tracked kickers.
- Treatment carries the identity more than the faces: huge display-to-label scale contrast,
  tight display tracking, mono kicker system, `font-variant-numeric: tabular-nums` globally.
- Ledger (Bricolage/Hanken/Space Mono) and Neutral (all-Inter) were trialed; difference at body
  sizes was marginal, so practicality won: Inter + JetBrains are ecosystem workhorses.

## D10 · Motion stack

- **Motion (motion.dev, ex-Framer Motion)** is the primary engine for layout transitions,
  presence animations, and orchestrated entrance sequences.
- **GSAP (`gsap` + `@gsap/react`)** is also a first-class dependency. Use it for timeline-driven
  draw-ins (SVG paths, count-ups, staggered reveals) where Framer Motion's spring model is the
  wrong primitive. The dashboard instruments (MonumentCurve, BankrollChart, RingHud, VerdictGauge)
  use GSAP by design and that is the settled call.
- Plain CSS for micro-interactions (hover, focus, active state transitions).
- Budget: ~5 choreographed moments per screen (loader, count-ups, chart draw-in, reveal stagger,
  hover micro). `prefers-reduced-motion` / `data-motion="off"` always respected.
- Motion AI Kit (`motion.dev/docs/ai-kit`) — optional install later for iteration speed.

## D12 · Range matrix encoding (13×13)

- **Yellow purged** from range states — warn-amber belongs to alerts, never to data surfaces.
- **Violet refused** for "mixed" — first live test of D3: the signature never touches data.
- Mixed is a *frequency*, not a category: rendered as the **same action color at half fill**
  (135° split: action tone / fold tone) with a dashed border for "conditional".
- Contrast fixed: in-range = solid fill (≈26% silver mixed into surface, bright label);
  fold = near-invisible (`rgba(255,255,255,0.015)`, dim label); leaking = loss red (verdict
  color, earned per D4). A6o vs A5o must be readable at a glance.

## D13 · Severity is intensity, not a hue — yellow purged system-wide

Three alert levels stay (critical / warning / neutral-review), but the warm amber is deleted
from the palette entirely — it was the only warm hue in an otherwise cool system, a palette
intruder. Violet was considered for warnings and **refused** (it would collide with D3 and
carries no danger association). Instead, warning shares the danger hue at lower intensity:

- **Critical**: `#FF5468`, soft fill, strong border, pulse animation, label `CRITICAL`.
- **Warning**: `#A5697B` (faded mauve-rose — same family, a full intensity stop down so the
  pair never blurs), softer fill/border, **no pulse**, label `REVIEW`.
- Color never carries severity alone — the label always accompanies it.
- Same grammar as D12: the matrix encodes frequency as fill-level of one hue; alerts encode
  severity as intensity of one hue. One rule everywhere: **more saturation = more money bleeding.**

## D11 · Process

- Design lab archive = **archive** (the lab, 49 bricks, all history). Quarry, don't extend.
- `poker 4` = sketches + this handoff (now consolidated here). Also frozen once copied to the repo.
- All real design-system work happens **in the poker repo via Claude Code**, with these three
  files as law. The catalog habit — building brick #50 instead of shipping — is the named enemy.

## D14 · BLACKOUT — the escalation amendment (2026-07-03)

**Written reason for touching settled ground** (per this file's own protocol): the owner
mandated an Awwwards-caliber overhaul — the ratified chassis is disciplined but executed
at survey intensity, not showpiece intensity. Three directions were built and compared on
real screens (`docs/design/direction-lab-2026-07/`): BLACKOUT (constitution radicalized),
FELT NOIR (re-opens D2), PHOSPHOR (re-opens D3+D5). **The owner picked BLACKOUT** — which
means D1–D5 and D11–D13 survive their first genuine challenge *intact*. Nothing re-opens;
everything escalates.

What BLACKOUT adds as law: monumental Bricolage display type with staggered row-rise
reveals; the dossier grammar (numbered folios, vertical mono rails, case-file cards); the
violet **presence halo** as D3 made physical; the live stat ticker with refusals in the
stream; the honesty strip as chrome. Full spec + rollout order:
`docs/design/BLACKOUT_ROLLOUT.md`. The rejected alternates stay in the lab as quarry (D11).
