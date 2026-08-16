# Decision Lab — 2026-08

Low-fidelity option prototypes for the **D1–D7 owner decision workshop** defined in
[`docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`](../../plans/2026-07-10-owner-ui-review-and-product-modes.md)
§5 step 2. Wave 0 correctness work is closing; Waves 1–2 are gated on these seven
product decisions.

Open [`index.html`](index.html) in a browser. Each decision page states what exists
today (verified against source and the running app), offers 2–3 options with the
trade-off named and a recommendation, and maps the exact consequence for the UIR
backlog.

Precedent: [`docs/design/direction-lab-2026-07/`](../direction-lab-2026-07/) — same
pattern (self-contained static HTML, tokens mirrored from `src/styles/tokens.css`,
compared side by side on real screens).

## Files

## Outcome — all seven ratified 2026-08-10

| File | Decision | Recommended | **Ratified** |
|---|---|---|---|
| `index.html` | Hub + dataset provenance + cross-cutting defects | — | — |
| `d1-adaptive-home.html` | Adaptive home vs universal Coach's Note | B | **B · one route, adaptive body** |
| `d2-performance-product.html` | Dashboard + Career as one product? | A | **C · audit first, re-ask D2 after** |
| `d3-money-context.html` | Persistent money context | A | **A · restore `ca7a08b`, derived-stats layer first** |
| `d4-profile-settings.html` | Profile as settings home | A | **B · full settings drawer, `/data` absorbed** |
| `d5-caveat-disclosure.html` | Caveats → progressive disclosure | A | **A · chip → reason → "Why?"** |
| `d6-villains.html` | Villains keep-or-cut | B | **A · keep it, build the workflow** |
| `d7-blackout-salvage.html` | BLACKOUT salvage scope | A | **A · port F-2, retire the park list** |
| `lab.css` | Shared chassis for all of the above | — | — |

Four went with the recommendation; D2, D4 and D6 did not. Each page keeps its
full option set — the ratified one carries a `RATIFIED` flag, and the constraints
raised against it are recorded in the plan file's §1.0, not re-argued here.

The re-sequenced backlog is in
[`docs/plans/2026-07-10-owner-ui-review-and-product-modes.md`](../../plans/2026-07-10-owner-ui-review-and-product-modes.md)
§5.2. Next slice out of the gate is **UIR-024 slice 1** — porting F-2's already-reviewed
primitives, which five downstream tasks are blocked on.

### D3 deserves a note

The owner remembered a sidebar money hero and was right. `ca7a08b` (PR #80,
2026-06-17) deleted it because "+$388.85 / +141.4% ROI · 250 tourneys" were
hardcoded literals next to a fake "Grinder · B+" rating — a trust defect, not a
design one. That commit named its own condition for return ("a real figure can
come later behind a derived-stats layer"), and that layer still does not exist.
So D3 is a data task wearing a design task's clothes.

## Ground rules these sketches follow

- **Tokens only.** Every colour is mirrored from `src/styles/tokens.css`. No new hue,
  no hand-rolled alpha. Violet appears at presence/wayfinding points only (D3):
  the active nav tick, the active tab underline, focus rings, CTA arrows.
- **Real numbers only, no lorem.** Every figure comes from the seeded demo dataset,
  read back out of IndexedDB after `Load demo dataset` in a fresh browser profile.
  The full provenance table is on `index.html`.
- **Low fidelity on purpose.** The sketches are diagrams for deciding, not previews
  of finished pixels. Anything that looks like a final component is a coincidence.
- **No page-redesign work.** This session produced planning artefacts only, per the
  workshop brief: no route change, no IA change, no `src/` change.

## Verification

- Rendered at 1440 / 1024 / 390 in Chromium: no whole-page horizontal scroll at any
  width; wide comparison tables scroll inside their own container.
- No placeholder text (`lorem`/`TODO`/`FIXME`) in any page.
- Stylesheet resolves relatively — the folder works opened from disk or served.

## Notable finding while verifying

The clone this was produced in arrived **shallow (50 commits)**, so none of the
historical references the plan depends on resolved — including the `ec39b34` /
`f6af6c2` / `0a64691` captures that UIR-021 mandates as its starting point. It has
been unshallowed to 262 commits and all referenced commits and the
`blackout/foundation-v2` + `ui/blackout-f*` branches are now reachable. Anyone
picking up UIR-021 or UIR-024 in a fresh session should check
`git rev-list --count HEAD` before assuming the history is there.
