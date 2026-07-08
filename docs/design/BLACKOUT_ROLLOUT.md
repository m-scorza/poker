# BLACKOUT — the Command Desk, radicalized

**Ratified by:** Matheus (owner pick, 2026-07-03, direction-lab three-way comparison)
**Reference in pixel form:** `docs/design/direction-lab-2026-07/1-blackout.html`
**Constitutional status:** D1–D5, D11–D13 remain law. BLACKOUT is an *escalation
amendment*, not a re-opening: same palette, same violet doctrine, same honesty
posture — executed at editorial, Awwwards-caliber intensity. The two rejected
alternates (`2-felt-noir.html`, `3-phosphor.html`) stay in the lab as quarry.

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

Kicker grammar: 10–11px mono, `letter-spacing: .2–.34em`, uppercase, dim;
optionally prefixed by a 34px hairline in violet (presence) or fg-dim.

## Motion language

- **Page load:** one orchestrated reveal — title rows rise (staggered ~90ms),
  then metadata fades up (translateY 26px), then cells/cards stagger in.
  Never scattered micro-animations; one big moment per page.
- **Hover:** structural, not glowy — padding shifts, scaleX fills on CTAs
  (ink fills left→right, label inverts), matrix cells scale 1.5 on the
  violet only-at-touch exception.
- **Library:** framer-motion only (Wave 3 F12 removes gsap). CSS-first where
  possible.
- `prefers-reduced-motion`: all reveals collapse to fades.

## Rollout order (each page = one PR, browser-verified, screenshot in PR)

0. **Foundation PR:** tokens v2 (type scale, spacing, folio/kicker/ticker/
   halo/case-file classes), `PresenceHalo`, `Ticker`, `Folio`,
   `HonestyStrip` shared components; absorbs abyss **F17** (27 inline hex →
   tokens) and starts **F25** (dead-selector sweep). Reference
   implementation: **CoachsNotePage** rebuilt to match the mockup.
1. HandsPage (+ replay modal dossier treatment)
2. LeaksPage (case-file cards; graveyard as "closed dossiers")
3. RangesPage (matrix per D12 under Blackout chrome; disclosure strip)
4. ArenaPage (the one theatrical page — table stays, chrome goes dossier)
5. CareerPage + SessionsPage + StatsPage
6. VillainsPage + DemoPage + Sidebar/Layout final pass; delete legacy
   selectors (F25 completes)

Implementation happens via delegated agents against THIS document + the
reference mockup + the foundation components; the orchestrator reviews every
PR against the signatures above. The catalog habit is still the named enemy:
no page ships a new pattern that isn't in this document without an amendment.
