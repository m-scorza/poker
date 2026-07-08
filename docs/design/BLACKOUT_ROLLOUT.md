# BLACKOUT — the Command Desk, radicalized

**Ratified by:** Matheus (owner pick, 2026-07-03, direction-lab three-way comparison)
**Reference in pixel form:** `docs/design/direction-lab-2026-07/1-blackout.html`
**Constitutional status:** D1–D5, D11–D13 remain law. BLACKOUT is an *escalation
amendment*, not a re-opening: same palette, same violet doctrine, same honesty
posture — executed at editorial, Awwwards-caliber intensity. The two rejected
alternates (`2-felt-noir.html`, `3-phosphor.html`) stay in the lab as quarry.
**Foundation v2 (D15, 2026-07-08):** the type/motion/halo/WebGL contradictions
this doc created with D7/D8/D9/D10 are settled in DECISIONS.md D15; the
§Foundation v2 section below is law and blocks all page waves.

## The one-sentence direction

A printed intelligence dossier that happens to be alive: monumental Bricolage
display type, hairline structure, monospace data ticks, grain and dot-grid
depth — and violet existing *only where the user is*.

## The signatures (what someone remembers)

1. **The presence halo.** A violet cursor halo (mix-blend screen, radial soft
   glow) that swells on interactive targets. This is D3 made physical —
   violet literally follows the user. Global component, `[V]` toggle honored,
   disabled on touch devices and `prefers-reduced-motion`.
2. **Monumental type.** Page titles set in Bricolage Grotesque 700–800 at
   `clamp(56px, 7vw, 116px)`, line-height ≤ .95, tracking −0.035em, with one
   word outlined (`-webkit-text-stroke`) per title. Titles enter as staggered
   row-rise reveals (overflow-hidden rows, translateY 110% → 0).
3. **The dossier grammar.** Every page is a numbered document: folio headers
   (`01 / The focus` + hairline rule + mono tag), a vertical mono side-rail
   (`DOSSIER · date`), and case-file cards with ribbon corner-tags for
   severity.
4. **The live ticker.** A mono marquee of real stats under the top bar
   (VPIP / PFR / reference match / net bb / refusal count). Data honesty in
   motion — refusals appear IN the ticker.
5. **The honesty strip.** Rule-based / refusal-as-UI / local-only, rendered as
   a three-cell strip under every verdict surface. The brand speaks in the
   chrome, not in a tooltip.

## Hard rules (unchanged law, restated for implementers)

- Violet `#9B6CFF` **only** at presence/wayfinding: halo, selection, focus,
  active nav tick, CTA arrows, live pulse. Never surfaces, borders-at-rest,
  charts, data.
- Money-positive is ALWAYS `#34D98C`. Loss `#FF5468`. Warning `#A5697B`
  (D13: severity = intensity of one hue; label always accompanies color).
- Matrix encoding per D12 (no yellow, no violet on data; mixed = half-fill).
- INK MONO chassis (`#0a0a0c`/`#111114`), tone-shift surfaces, hairlines,
  no decorative glow, no rounded glowing cards, no gradients-as-decoration.
- All UI copy in English; every refusal keeps its reason on screen.

## Type system

| Role | Face | Notes |
|---|---|---|
| Display / titles | Bricolage Grotesque (opsz auto) | 640–800 weight, tight leading |
| Body / UI | Hanken Grotesk | 300–700 |
| Data / labels / nav | Space Mono | uppercase + letterspacing for kickers |

All three faces are **self-hosted via `@fontsource`** (D15 amends D9 — Inter and
JetBrains Mono leave `tokens.css`). No runtime remote font fetches, ever.

Kicker grammar: 10–11px mono, `letter-spacing: .2–.34em`, uppercase, dim;
optionally prefixed by a 34px hairline in violet (presence) or fg-dim.
**Legibility floor:** mono data text never below 10px; at 10px, tracking caps
at `.26em`. Table/receipt data sits at 12–13px.

## Motion language

- **Page load:** one orchestrated reveal — title rows rise (staggered ~90ms),
  then metadata fades up (translateY 26px), then cells/cards stagger in.
  Never scattered micro-animations; one big moment per page.
- **Route change:** AnimatePresence transition — outgoing page fades to 0
  opacity with a 0.99 scale over ~200ms, incoming enters as the page-load
  reveal. **The loading spinner between routes is dead**; lazy-chunk waits
  hide inside the exit phase.
- **Hover:** structural, not glowy — padding shifts, scaleX fills on CTAs
  (ink fills left→right, label inverts), matrix cells scale 1.5 on the
  violet only-at-touch exception.
- **Library:** framer-motion ONLY (D15 amends D10; gsap is removed, closing
  abyss F12). CSS-first where possible.
- **Motion tokens** (implemented as exported constants + CSS custom props;
  every page uses these, never ad-hoc values):
  - Easings: `--ease-rise: cubic-bezier(.2,.9,.24,1)` (reveals),
    `--ease-ink: cubic-bezier(.6,0,.2,1)` (fills/inversions).
  - Durations: micro 200ms · move 300ms · reveal 900ms · stagger step 90ms.
  - Primitives (Foundation v2 components, not per-page code):
    `<TitleReveal>` (row-rise variants), `<FolioSection>` (scroll-linked
    `useInView` reveal), `<PageTransition>` (the route wrapper).
- **Scroll:** folios reveal as they enter the viewport (once, not scrubbed)
  in the app; the landing page alone may scroll-scrub its hero choreography.
- **Ticker:** a real marquee — pauses on hover, duplicate run is
  `aria-hidden`, honors reduced-motion by standing still.
- `prefers-reduced-motion`: all reveals collapse to fades; InkField falls
  back to static grain.

## Foundation v2 (D15) — the hardening wave, blocks all page waves

### Tranche-2 patterns (specified here so nine page agents cannot improvise)

- **Dossier table** (Hands / Sessions / Villains): hairline rows, no zebra,
  mono numerics right-aligned with tabular-nums, 12–13px data, uppercase mono
  column kickers, row hover = `padding-left` shift + fg brighten (the receipt
  treatment scaled up), sort state marked by a violet tick (wayfinding).
  Virtualized tables keep the identical visual grammar.
- **Case-file modal** (hand replay, confirmations): the modal is a *pulled
  file* — it slides from the trigger's side over a dimmed (not blurred)
  backdrop, carries a folio header (`FILE · #handId`), a severity ribbon when
  graded, and closes by sliding back. Focus-trapped; reduced-motion = fade.
- **Filter rail:** filters render as a mono strip under the folio header —
  uppercase labels, hairline-separated segments, active segment inverted
  (fg on bg), never dropdown-soup. Selects keep native semantics underneath.
- **Chart tokens:** Recharts axes/grid/tooltip pull ONLY from tokens —
  grid `--border`, axis text `--fg-dim` mono 10px, tooltip = `--bg-2` +
  hairline + mono, series colors from the data-semantic set (`--money`,
  `--loss`, `--accent`, `--fg-dim`). Violet never plots.
- **Empty states:** an empty surface is a dossier page with nothing filed —
  outlined folio number, one-line mono explanation, and a single CTA
  (ink-fill treatment). Never an icon-and-sad-text card.
- **Density modes:** `display` (monumental hero, clamp(48px,7vw,116px) title —
  Coach's Note, Career, landing) and `work` (compressed folio header, title
  clamp(28px,4vw,44px), ticker + honesty strip intact — Hands, Ranges,
  Sessions, Villains). Dense tool pages MUST use `work`; the grammar is the
  same, only the scale changes.

### Mobile grammar (interpretation, not deletion)

- The vertical side-rail becomes a horizontal mono strip above the title
  (`DOSSIER · date`), never deleted.
- The hero meta column becomes a horizontal scroll row of meta cells under
  the title.
- Case-file ribbons become inline severity tags at the card's kicker line.
- Folio numbers scale to 40px outline; ticker and honesty strip persist
  (honesty strip stacks).
- Touch: halo disabled, hover states have focus/active equivalents.

### The showpiece — `InkField` (D15's instrument exception to D8)

One data-reactive WebGL shader component: a living ink-light field on the
INK MONO chassis — slow fluid grain that leans toward the cursor, drifts
with scroll, and tints imperceptibly toward `--money` or `--loss` with the
loaded sample's net result. Allowed surfaces: **landing hero** (primary),
optionally **Arena**. Requirements: tiny footprint (raw WebGL or OGL — no
three.js), static-grain fallback (no WebGL / reduced-motion), DPR capped at
1.5, rAF paused when off-screen or tab-hidden. It must read as an
instrument (it responds to the user's data), never as decoration.

### Foundation v2 deliverables (2–3 PRs, parallel agents)

- **F-1 · Type & motion core:** self-host Hanken Grotesk + Space Mono,
  rewire `tokens.css` faces; `<PageTransition>` route wrapper (spinner dies);
  `<TitleReveal>` / `<FolioSection>` primitives + motion tokens; ticker
  upgrade; halo consolidation (lerped, D15 size, never `cursor:none`);
  legibility floor pass on existing bk- classes.
- **F-2 · Tranche-2 components:** dossier table, case-file modal, filter
  rail, chart tokens, empty state, density modes — as `components/blackout/*`
  + `blackout.css` additions.
- **F-3 · InkField:** the shader instrument, isolated, with fallback.

## Rollout order (each page = one PR, browser-verified, screenshot in PR)

0. ✅ **Foundation PR** (#128, merged via #132): tokens, `Ticker`, `Folio`,
   `HonestyStrip`, self-hosted Bricolage; **CoachsNotePage** as reference.
0.5. **Foundation v2** (D15, above) — blocks everything below.
1. **Landing page** (new standalone route; the app's entry is unchanged):
   the showpiece surface — InkField hero, self-assembling dossier
   choreography (scroll-scrubbed), product story told in the honesty
   strip's voice (rule-based / refusal-as-UI / local-only), ink-fill CTA
   into the app.
2. HandsPage (+ replay modal as the case-file pattern) — `work` density
3. LeaksPage (case-file cards; graveyard as "closed dossiers")
4. RangesPage (matrix per D12 under Blackout chrome; disclosure strip)
5. ArenaPage (the one theatrical page — table stays, chrome goes dossier;
   may consume InkField)
6. CareerPage + SessionsPage (chart tokens mandatory; StatsPage is a
   redirect stub — no work)
7. **DashboardPage + desk instruments** (added by D15 — rebuild
   VerdictGauge/RingHud/MonumentCurve/BankrollChart on tokens and
   framer-motion; gsap uninstalls here, F12 closes)
8. VillainsPage + DemoPage + Sidebar/Layout final pass; delete legacy
   selectors (F25 completes)

Implementation happens via delegated agents against THIS document + the
reference mockup + the foundation components; the orchestrator reviews every
PR against the signatures above. The catalog habit is still the named enemy:
no page ships a new pattern that isn't in this document without an amendment.
