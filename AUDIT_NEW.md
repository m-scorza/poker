# AUDIT_NEW.md — Repo audit (NEW issues only)

Scope: read-only static review. Excludes the five already-audited
categories: file-upload size / DoS, CSS+Tailwind mixing, TypeScript
`any` / `@ts-ignore`, dead/duplicate code, localStorage validation.

Severity labels in Section A: **BUG_CONFIRMED** (code is wrong and
will misbehave on realistic input) / **LIKELY_BUG** (very probably
wrong, needs domain confirmation) / **RISKY_PATTERN** (works today
but is a footgun).

---

## A — Correctness bugs

| # | File:line | What's wrong | Trigger | Severity |
|---|---|---|---|---|
| A1 | `src/parser/pokerstars.ts:127–129, 160, 249, 265, 281, 328, 344–345, 361, 410, 433, 452` | All chip / blind / pot / bet math uses `parseFloat` and accumulates into `Map<string,number>` via `+=`. No integer-cents normalization, no rounding. `0.1 + 0.2 !== 0.3` ripples through `totalInvested`, `collectedAmounts`, `heroChipsAfter` (line 479), and `villainDeltas` (lines 480–486). | Cash games or fractional buy-ins (`$0.85+$0.15`, `$0.05/$0.10`) — `heroPutIn` drifts by ε across many actions, then `chipsBefore - heroPutIn + heroWon` shows misleading `.0000004` deltas in PnL displays and breaks equality-based assertions in tests. | RISKY_PATTERN |
| A2 | `src/parser/pokerstars.ts:137` | `new Date(dateMatch[1]! + ' UTC')` — input is `"2026/04/05 18:16:05"`. The `YYYY/MM/DD` form with a trailing ` UTC` is **not** ISO-8601 and not specified by ECMA-262 §21.4.3.2; V8 happens to accept it, but Firefox/Safari may return `Invalid Date`. Combined with line 136 (`if (!dateMatch) return null`) the whole hand is silently dropped. | Running the parser in Firefox/Safari (PWA target per `vite.config.ts:10`) — every hand can return `null`, but only the silent counter is bumped (line 86 `catch` swallows). | LIKELY_BUG |
| A3 | `src/parser/pokerstars.ts:84–87` | `catch {}` per hand block: any throw inside `parseHandBlock` is swallowed with no log, no warning, no count. Failure rate is invisible. | A malformed hand (truncated SUMMARY, unicode surrogate in player name causing a downstream regex throw) — the user sees `handsFound: N-1` with no indication something dropped. Diverges silently from raw file. | RISKY_PATTERN |
| A4 | `src/parser/pokerstars.ts:160` | `parseFloat(seatMatch[3]!.replace(/,/g, ''))` strips commas but leaves dots untouched. PokerStars' Brazilian / EU formats sometimes emit thousand-separators as dots (`"1.500 in chips"`). `parseFloat("1.500")` returns `1.5`, not `1500`. | Any non-en hand-history dump where thousand-grouping uses dots (the `buyInExtractor.brazilian` regex at `buyInExtractor.ts:90` already proves the localised format exists in your data). | LIKELY_BUG — `ASK_USER` whether PS ever emits dot-grouped chip counts. |
| A5 | `src/parser/pokerstars.ts:185, 526` | `handBounty` is accumulated **per hand** and written into `tournament.bounty` (line 526). The Tournament partial is produced for every hand, so on the import side the last-written hand wins — the persisted Tournament row will show the bounty of whatever hand happened to be parsed last in the file, not the buy-in's structural bounty. | Any PKO tournament. Aggregate bounty/equity-drop math in `bountyAnalyzer.ts:101–166` will read a per-hand value as if it were the tournament's standing bounty. | LIKELY_BUG |
| A6 | `src/parser/position.ts:53–57` | Button-fallback uses `sorted[0]` (the lowest-numbered active seat) when the parsed button seat isn't present in active seats. The button never moves to "lowest seat" in real play — it moves clockwise. Off-by-one for every downstream position when this branch fires. | The hand body lists a button seat (e.g. Seat 4) but Seat 4 was eliminated and is not in `Seat N:` lines (rare on PokerStars but possible on sit-outs). All position labels then rotate from the wrong anchor → false `OVERFOLD` / `OPENED_OUT_OF_RANGE`. | LIKELY_BUG — `ASK_USER` how often PS ever names a non-active button. |
| A7 | `src/parser/pokerstars.ts:526` + `tournamentSummary.ts:67–70` | Tournament partials are emitted **per hand**; the importer must reconcile collisions (same tournament id seen N times across N hands). If the importer naively does `tournaments.put(...)` on each hand, fields populated late in some hands (`finishPosition`, `prize`) will be overwritten by `null` from earlier hands depending on iteration order. | Any tournament with multiple parsed hands where `finished the tournament` only appears in the last hand. Need to inspect `store.ts` `importHands` write path. | LIKELY_BUG / `ASK_USER` |
| A8 | `src/analysis/scenarioDetector.ts:189` | `cbetHU = flopPlayerCount === 2` where `flopPlayerCount = players.length - preflopFolders.size`. **Players who shoved all-in preflop and got called are counted as flop participants**, even though they have no decision on the flop. This inflates `flopPlayerCount` above 2 and marks otherwise-HU pots as multi-way. | Hero opens, BTN shoves all-in preflop, hero calls → flopPlayerCount = 2 ✓. But: hero opens, MP shoves, BTN folds, hero calls → players.length = N, preflopFolders = N-2, flopPlayerCount = 2 ✓. Worse case: 3-bet pot where shover is all-in; postflop is HU but `cbetHU` may still report true. ASK_USER whether this matters for the critical "100% c-bet HU vs BB" leak target. | `ASK_USER` |
| A9 | `src/analysis/icmDetector.ts:111–126` | The score→stage mapping is non-monotone: `score ≤ 6 → bubble (RP 10)`, `score ≤ 8 → itm (RP 8)`, else `final_table (RP 15)`. So `itm` is only assigned for `score ∈ {7,8}` and represents *higher* risk than `bubble` in score but *lower* RP. Read literally this is fine (post-bubble RP drops), but the score increments are linear with "later in tournament", which is now ambiguously mapped. Downstream consumers using RP as a numeric weight will see a non-monotone curve and may produce a "tighter on bubble, looser ITM, tightest FT" pattern that's only partially intentional. | Late-tournament hands. The bubble→ITM drop is right in spirit; the question is whether the abrupt jump from RP 10 to RP 8 to RP 15 was deliberately calibrated or accidental. | `ASK_USER` |
| A10 | `src/analysis/bountyAnalyzer.ts:136` | `const startingStack = 1500;` is hardcoded inside the BPWR estimator. PokerStars MTTs commonly start at 3 000 / 5 000 / 10 000 / 50 000 chips. Mapping bounty $ to chip equivalent through a 1 500-chip denominator under-estimates `bountyChipValue` (and therefore `equityDrop`) by 2×–30×. | Any non-1 500-chip start tournament (which is most MTTs). | LIKELY_BUG |
| A11 | `src/parser/pokerstars.ts:198–200, 199` and CLAUDE.md Bug #4 | `escapeRegex(heroName)` is applied for the hero-card line, but the **opener regexes** (`RE_FOLDS`, `RE_CHECKS`, `RE_CALLS`, `RE_RAISES`, `RE_BETS`, `RE_ANTE`, `RE_SMALL_BLIND`, `RE_BIG_BLIND`, `RE_COLLECTED`, `RE_BOUNTY_WINS`, `RE_SHOWED`, `RE_SHOWED_AND_WON`, `RE_WON_SUMMARY`) all capture `^(.+?)` greedily for the player name. A player named exactly `"folds"` (or any string containing `: folds`) would not be parsed as actions of that player — `RE_FOLDS` would still match because `(.+?)` is non-greedy. Less harmful than ReDoS, but a player name containing a colon (`"Roy: the Coup"`) would be split mid-name and routed under `Roy` for some lines, `Roy: the Coup` for others. | Unicode colons or stylised player names. PokerStars does not forbid them. | RISKY_PATTERN |
| A12 | `src/pages/ArenaPage.tsx:121–123` | `setTimeout(() => nextHand(), 2000)` fires from a click handler with no `clearTimeout`. If the user navigates away (lazy route unmount per `App.tsx:39`) during the 2 s, `setDrill(...)` inside `nextHand` runs against an unmounted component. React 19 no longer warns but the state update is wasted; if `nextHand` reads `drill` from a closure, the stale closure runs against a freshly-mounted instance after fast back-nav and produces wrong score totals. | Answer drill → immediately click sidebar → click back into Arena before 2 s elapse. | RISKY_PATTERN |
| A13 | `src/pages/RangesPage.tsx:389` | `const validation = useMemo(() => rangeValidationSummary(), [])` — empty deps with no arguments. Whatever `rangeValidationSummary()` reads (module-level range tables, strategy profile via Zustand selector, etc.) is captured once. If the user switches strategy profile (Baseline ↔ Advanced) via the sidebar, the validator panel never refreshes. | Toggle profile while on `/ranges` with `viewMode === 'validator'`. | LIKELY_BUG — confirm by reading `rangeValidationSummary`'s implementation. |
| A14 | `src/parser/pokerstars.ts:136` | `if (!dateMatch) return null` drops the entire hand block silently. Combined with the outer `catch {}` (line 84) the user has no signal that a hand was unparseable for date reasons specifically. | Cash-game header that doesn't include the regex's expected " UTC" token. | RISKY_PATTERN |
| A15 | `src/parser/pokerstars.ts:202–383` parsing loop | The action parser runs on the entire `lines` array including SUMMARY-section lines like `"Seat 1: player1 collected $X from pot"`. Lines 40 / 416 (`RE_COLLECTED`, `RE_WON_SUMMARY`) are matched in a separate later loop, so this is fine — but `RE_RAISES = /^(.+?): raises \$?([\d.]+) to \$?([\d.]+)/` could falsely match a SUMMARY line if it ever contained the literal `: raises X to Y` (it doesn't on PokerStars, but the guard `break` on SUMMARY (line 232) does protect — provided `*** SUMMARY ***` always precedes such lines). Note that `*** SHOW DOWN ***` (line 228) also `break`s, so SUMMARY's own "won" markers are parsed in the second pass only. | Defensive only. No reproducer today. | RISKY_PATTERN |
| A16 | `src/data/db.ts:94` | `db.version(4).stores({})` — schema bump with empty body and no `.upgrade()`. Dexie permits this (used as a sentinel) but a future contributor will assume "version 4 did nothing" when in fact the version number was burned. If a real version-4 migration is needed later it'll have to skip to v5, and any branch that added v4 logic on a parallel branch (Antigravity/Codex/Claude in parallel per the user's note) will silently overwrite without an upgrade hook firing. | Multi-agent merge. | RISKY_PATTERN |
| A17 | Parser surface (`pokerstars.ts`, `ggpoker.ts`, `openHandHistory.ts`) | **Side pots, run-it-twice, disconnects are not modeled.** `RE_TOTAL_POT` (line 34) captures `Total pot \$?([\d.]+)` and silently ignores the trailing `Main pot $X. Side pot $Y. | Rake Z` form PokerStars emits on all-in multi-way. `collectedAmounts` (lines 398–425) sums *all* `collected from main/side pot` lines into a single number per player, so winners are merged correctly — but `hand.totalPot` is **only the main pot** when side pots exist. Downstream callers using `hand.totalPot` for bb/pot ratios understate the real pot. | Any multi-way all-in. | LIKELY_BUG |

**Confirmed-clean negatives** (do not regress these):
- `escapeRegex` (`pokerstars.ts:557`) is applied to the hero-cards regex.
- BOM strip + CRLF normalization (`pokerstars.ts:63–66`).
- Deduplication by hand id (`pokerstars.ts:80–81`).
- `ConfirmDialog.tsx` traps Tab + restores focus + uses `role="dialog"`.

---

## B — Security beyond uploads

| # | File:line | Finding | Severity |
|---|---|---|---|
| B1 | repo-wide | No `dangerouslySetInnerHTML`, `innerHTML =`, `eval(`, `Function(`, or `document.write` calls. All player-name/handKey rendering routes through JSX (auto-escaped). | ✓ clean |
| B2 | `src/pages/ArenaPage.tsx:62, 83` | `Math.random()` for drill pool sampling — not security-sensitive; fine. | ✓ acceptable |
| B3 | `src/components/hands/HandsUpload.tsx:168` | `new Worker(new URL('../../parser/worker.ts', import.meta.url), { type: 'module' })` — internal worker, bundled, no remote URL fetch. Safe. | ✓ clean |
| B4 | `vite.config.ts:10–33` | `vite-plugin-pwa` with `registerType: 'autoUpdate'`. The service worker will pre-cache the build assets. If a future release ships a security fix, users on the previous build will continue serving the old (vulnerable) JS from cache until the worker activates on the next load. No `skipWaiting` configured. Worth knowing; not an active vulnerability. | RISKY_PATTERN |
| B5 | repo-wide | No hardcoded API keys, tokens, secrets, `process.env`, or `import.meta.env` references in `src/`. Client-only app, no third-party fetch endpoints. | ✓ clean |
| B6 | All parser regexes | All player-name captures use `^(.+?):` (non-greedy, anchored, bounded by the colon). No catastrophic-backtracking pattern (`(.+)+`, alternation with overlapping prefixes) found. | ✓ no ReDoS |
| B7 | Console logging audit (`store.ts:208`, `localStorage.ts:89`, `ErrorBoundary.tsx:26`, `HandReplay.tsx:461`, `rangeChecker.ts:154`, `ggpoker.ts:288`) | None of these log full hand-history text, hole cards, or villain identifiers in a way that would leak PII beyond what the user already has in IndexedDB. `ErrorBoundary` logs the React error stack — fine for local-only PWA. | ✓ acceptable |
| B8 | `vite.config.ts` | No `script-src` / CSP meta tag or header guidance in build. For a PWA that loads user-supplied `.txt`/`.json`, a strict CSP in `index.html` would be cheap defense-in-depth. | RISKY_PATTERN (low) |

---

## C — Performance and resource use

| # | File:line | Finding | Severity |
|---|---|---|---|
| C1 | `package.json:28` | `lucide-react: ^1.7.0` is wildly off from the actual npm release line (lucide-react is in the 0.4xx–0.5xx range). Either (a) installed from a different package than intended, (b) a typo someone pinned through, or (c) installs an unrelated package. `ASK_USER` to confirm what's actually in `node_modules/lucide-react/package.json`. Possible silent bundle bloat or, worse, an unintended package. | `ASK_USER` (high impact if wrong) |
| C2 | Parsing path | Web Worker is wired (`HandsUpload.tsx:168`) and `worker.onerror` is handled (line 216). ✓ — no finding. | ✓ clean |
| C3 | `src/components/hands/HandsTable.tsx` | `@tanstack/react-virtual` is used → hand list virtualized. ✓ — no finding. | ✓ clean |
| C4 | `src/App.tsx:6–15` | All pages lazy-loaded. ✓ | ✓ clean |
| C5 | `src/pages/ArenaPage.tsx`, `RangesPage.tsx`, `HandReplay.tsx` | Heavy components do not memoize derived data with `useMemo` consistently — `HandReplay.tsx` recomputes `streets`, `streetActions`, `postflopSpots`, `boardTexture` on every render. Worth checking with the React profiler under a long drill session; not measured here. | RISKY_PATTERN |
| C6 | `src/parser/pokerstars.ts:69` | `content.split(/\n{2,}/)` builds the full block array in memory, then iterates. For a 20 MB hand-history file (the parser cap, `pokerstars.ts:55`) this materialises every hand text as a separate string before parsing — peak memory ~2× input. Streaming line-by-line would halve memory. | RISKY_PATTERN |
| C7 | `src/parser/pokerstars.ts:152–163, 202, 386, 401, 430, 445` | The hand block is iterated **six** times (seat scan, action scan, showdown scan, collected scan, pot/rake scan, finish/prize scan). A single pass with a state machine would be cleaner and faster — but the file sizes per block are small, so this is style not perf. | low |
| C8 | `vite-plugin-pwa` | Recharts (line 33) + framer-motion (line 24) + jspdf (lines 25–26) total ~400 KB+ gzipped. With route-level code splitting (`App.tsx` `lazy`) most users don't pay all of it on first load, but the PWA precache pulls everything. Worth measuring bundle. | RISKY_PATTERN |

---

## D — React-specific

| # | File:line | Finding | Severity |
|---|---|---|---|
| D1 | `src/components/hands/HandReplay.tsx:228, 248, 360, 395`; `src/components/hands/HandsUpload.tsx:344, 355`; `src/components/shared/DualRangeMatrix.tsx:214` | `key={i}` on `.map(...)` over arrays that can change between renders (deviations, action lists, warnings). React will misattribute state when the underlying list shifts. For pure-presentational items like `PokerCard` (HandReplay 228/248) the visual impact is nil; for action rows and warning rows it can flash wrong content during a list edit. | LIKELY_BUG (low for cards, medium for action rows) |
| D2 | `src/App.tsx:48–52` | Single top-level `ErrorBoundary` wraps everything. A throw inside `HandReplay`, `Arena`, or any chart unmounts the whole app instead of a section. Per-page boundaries (or one inside the Suspense fallback) would degrade gracefully. | RISKY_PATTERN |
| D3 | `src/pages/RangesPage.tsx:389` | (see A13) — useMemo with `[]` over function reading external state. | LIKELY_BUG |
| D4 | `src/pages/ArenaPage.tsx:121–123` | (see A12) — un-cleared timeout from click handler instead of `useEffect`. | RISKY_PATTERN |
| D5 | `src/pages/HandsPage.tsx:46–68` | 10+ separate `useState` filters that all flow into the same memoized derivation. A single `useReducer` (or one filter-object state) would prevent half-batched updates and make rollback easier. Not a bug — maintainability flag. | low |
| D6 | All pages | Pages range 374–526 LOC. None is catastrophic, but `HandReplay.tsx` (526) mixes data fetching, replay state, 2D table rendering, postflop spot rendering, and equity calc in one file — natural extraction targets: a `<TableLayout>` and a `<PostflopSpotsList>` subcomponent. | low |

---

## E — Accessibility

| # | File:line | Finding | Severity |
|---|---|---|---|
| E1 | `src/pages/VillainsPage.tsx:126–132` | Search input has `placeholder="Search player..."` but no `<label htmlFor>` and no `aria-label`. Screen readers announce "edit text" with no purpose. | RISKY_PATTERN |
| E2 | `src/pages/VillainsPage.tsx:134–146` | `<select>` lacks an associated label. The options ("All types"/"Fish"/...) provide context but no input-name. | RISKY_PATTERN |
| E3 | `src/pages/VillainsPage.tsx:152–156` | Loading spinner is a bare `<div className="animate-spin">` with no `role="status"` / `aria-live="polite"` / `aria-label`. Screen readers don't announce that the page is loading. Same pattern in `App.tsx:18–22` (`PageLoader`). | RISKY_PATTERN |
| E4 | `src/components/shared/ConfirmDialog.tsx` (lines confirmed in survey) | Focus trap, focus restore, `role="dialog"`, `aria-modal="true"` — implemented correctly. ✓ | ✓ clean |
| E5 | `src/components/hands/HandReplay.tsx:90–104` | Focus trap + restore implemented. Modal has `aria-label="Close replay"` on the X button but no `aria-labelledby` on the dialog itself naming the hand. Minor. | low |
| E6 | UI tokens (CLAUDE.md "UI/UX") | `#00ff88` accent on `#0a0a0f` bg → contrast ratio ≈ 13.4:1 (passes WCAG AAA). `#ff4444` red on `#0a0a0f` → ≈ 5.7:1 (passes AA, fails AAA for body text). Acceptable. | ✓ acceptable |
| E7 | Range grid 13×13 (`src/components/shared/RangeGrid.tsx` per CLAUDE.md) | Color-only encoding for compliance status would fail color-blind users — `ASK_USER` whether cells carry any non-color cue (text label, pattern). | `ASK_USER` |

---

## F — Testing, observability, deployability

| # | File:line | Finding | Severity |
|---|---|---|---|
| F1 | repo root | **No `.github/workflows/` directory.** Zero CI. Nothing runs the test suite, build, or any check on push. This is the single largest gap given the user's note that three different AI tools are editing in parallel. | high |
| F2 | repo root | **No ESLint / Prettier config** (`.eslintrc*`, `eslint.config.*` absent). TypeScript strict mode (`tsconfig.json` per CLAUDE.md) partially substitutes, but there's no rule against unused vars, console.log, react-hooks/exhaustive-deps, jsx-a11y, etc. The `key={i}` and stale-memo findings above are exactly what `eslint-plugin-react-hooks` and `react/jsx-key` would have caught for free. | high |
| F3 | `package.json:6–14` | No `lint`, `typecheck`, or `format` npm scripts. `tsc -b` only runs as part of `build`. Contributors have no quick "is this code OK" loop. | medium |
| F4 | `vitest.config` (in `vite.config.ts:40–44`) | No coverage tooling configured (no `@vitest/coverage-v8`, no thresholds). With ~43 tests over a critical parser + math layer, coverage is unknown. | medium |
| F5 | repo-wide | No error-reporting integration (Sentry, etc.). `ErrorBoundary.tsx:26` `console.error`s; nothing else. For a client-only PWA on real users this is the only signal you'll ever get. | medium |
| F6 | `vite.config.ts:10–33` | `VitePWA({ registerType: 'autoUpdate' })` without explicit `skipWaiting` / `clientsClaim`. Cache-busting between releases will be lazy (next tab open). For a tool where parser bugs ship to users, faster activation is worth `workbox.skipWaiting: true`. | low |
| F7 | `package.json:14` (`"prepare": "sh scripts/install-hooks.sh"`) | The hook installer requires `sh` and runs at every `npm install`. On a clean Windows checkout without WSL / git-bash on PATH, `prepare` fails and the user gets no commit hooks. Add a Node-based installer or skip on Windows gracefully. | RISKY_PATTERN |
| F8 | `src/data/db.ts:94` | Empty `db.version(4).stores({})` — see A16. | RISKY_PATTERN |
| F9 | Test fixture surface | `src/parser/__tests__/fixtureSweep.test.ts` exists per the survey. No equivalent fixture sweep for `tournamentSummary.ts` or for GGPoker side-pot files (since side-pots aren't modeled — see A17). | medium |

---

## G — Domain-specific (poker) sanity

| # | File:line | Finding | Severity |
|---|---|---|---|
| G1 | Hand ranking | Delegated to `poker-odds-calculator ^0.4.0` (`package.json:29`). Wheel A-2-3-4-5 / steel-wheel handling is the library's problem — confirmed not implemented in-repo. ✓ | ✓ ASK_USER if you want to assert correctness with a fixture test. |
| G2 | `src/analysis/scenarioDetector.ts:189` | `cbetHU` definition — see A8. The critical "C-bet HU 100%" metric in CLAUDE.md may misclassify 3-bet pots with a preflop all-iner. | `ASK_USER` |
| G3 | `src/analysis/bountyAnalyzer.ts:136` | Hardcoded 1 500 starting stack — see A10. PokerStars STT starts at 1 500 (matches), MTT starts vary. ASK_USER which tournament formats are in scope. | LIKELY_BUG |
| G4 | `src/analysis/icmDetector.ts` | Score→RP mapping non-monotone — see A9. Risk premium 10 (bubble) → 8 (itm) → 15 (FT). Is the bubble→ITM drop deliberate? CLAUDE.md says bubble RP 10–15%, ITM lower, FT 5–20% so directionally yes — but the magnitudes (RP 8 for *all* of ITM) flatten too much for late-ITM short stacks. | `ASK_USER` |
| G5 | `src/parser/pokerstars.ts:526` and `src/types/hand.ts` (per CLAUDE.md `Tournament`) | Per-hand bounty overwriting tournament bounty — see A5. | LIKELY_BUG |
| G6 | `src/analysis/scenarioDetector.ts:78–85` | `lastRaise.amount / bigBlind >= 5` to detect `BB_VS_LARGE_RAISE`. `amount` for a raise stores the "to" amount (`pokerstars.ts:352`). So a 3x open to 60 over BB=20 gives `60 / 20 = 3` — correct, not flagged as large. A 5x open to 100 gives `100 / 20 = 5` — flagged. But: an open-shove to 800 with BB=20 gives 40 — flagged. And an open-shove for 12bb (240 over BB=20) gives 12, also flagged. So in practice the 5×-BB threshold conflates large opens and small all-in shoves, but `hasAllInRaise` (line 63) already short-circuits to `BB_VS_LARGE_RAISE` (line 73) before this check. ✓ acceptable as written. | ✓ clean — flagging here only as a near-miss. |
| G7 | Side pots | Not parsed — see A17. Hero PnL is computed from `collectedAmounts` (sums all "collected from main/side pot" lines) but `hand.totalPot` is only the main pot. Equity-vs-pot-size analysis is biased low for multi-way all-ins. | LIKELY_BUG |
| G8 | Run-it-twice / disconnects | Not parsed at all. Real-money sites rarely emit these; PokerStars MTT/SNG handhistories typically don't. `ASK_USER` whether the supported sites can ever emit RIT or disconnect markers in scope. | `ASK_USER` |
| G9 | Position rotation across hands | Each hand re-derives position from its own parsed `Seat #N is the button` line (`pokerstars.ts:146–148`) → no cross-hand rotation logic. ✓ correct by construction. | ✓ clean |
| G10 | Stack tracking | Per-hand: `chipsBefore` comes from the hand's `Seat N:` line; `chipsAfter` = `chipsBefore - heroPutIn + heroWon` (`pokerstars.ts:479`). Not re-derived from previous hand. ✓ | ✓ clean |

---

## H — Prioritized fix queue (NEW issues only)

Ordered by impact-per-effort. S = an afternoon, M = ~1–3 days, L = a week+.

| # | Title | Rationale | Effort | Source |
|---|---|---|---|---|
| H1 | Add a GitHub Actions CI workflow that runs `npm test` + `npm run build` on every push and PR. | Three AI tools edit in parallel; without CI, regressions ship. This single change catches most future drift cheaply. | S | F1 |
| H2 | Add ESLint with `react-hooks/exhaustive-deps`, `react/jsx-key`, `react/no-unstable-nested-components`, `jsx-a11y/label-has-associated-control`. Wire into CI from H1. | The `key={i}` × 7, the empty-deps memo at `RangesPage.tsx:389`, and the VillainsPage unlabeled inputs would all have been blocked at PR time. | S | F2, D1, D3, E1, E2 |
| H3 | Verify `lucide-react@^1.7.0` actually installs the intended package; pin to a known-good version. | If this is a typo or supply-chain miss, every icon in the app comes from an unexpected source. Two-minute check, potentially huge blast radius. | S | C1 |
| H4 | Fix `bountyAnalyzer.ts:136` `startingStack` — derive from `Tournament.startingStack` (parsed from the first `Seat N:` chip count in the first hand of the tournament). | Off-by-2×–30× in `equityDrop` directly breaks the bounty analysis feature for any non-1 500-stack format. | S | A10, G3 |
| H5 | Add side-pot parsing to `pokerstars.ts` `RE_TOTAL_POT` so `hand.totalPot` reflects main + side, or expose `totalMainPot` / `totalSidePot` separately. | Multi-way all-ins are common at FT; current totalPot under-reports and biases pot-odds math. | M | A17, G7 |
| H6 | Replace `parseFloat` chip math with integer-cents normalization in the parser (multiply by 100, round, store as int). Surface as `number` of cents in the data model; format only at the UI boundary. | Eliminates float drift in PnL displays and removes a whole class of "off by 0.0000001" test flake. | M | A1 |
| H7 | Per-hand bounty must not be persisted onto the Tournament row. Move `handBounty` to a per-hand field (e.g. `hand.bountyCollected`) and compute the tournament-level bounty from the first knockout in the import, or from the tournament's structural buy-in field. | A5 silently corrupts PKO analysis at the tournament level. | S | A5, G5 |
| H8 | Replace `new Date(s + ' UTC')` with explicit `Date.UTC(y, m-1, d, hh, mm, ss)` parsing from regex groups. | Removes browser-engine-dependent parsing. Hands stop silently dropping in Firefox/Safari. | S | A2 |
| H9 | Add an `aria-label` (or visually-hidden `<label>`) to every form input in `VillainsPage.tsx` and any spinner gets `role="status" aria-live="polite"`. | One-pass change. Once ESLint+jsx-a11y is in (H2), this is a 30-minute task. | S | E1, E2, E3 |
| H10 | Replace the `setTimeout(nextHand, 2000)` in `ArenaPage.tsx:121` with a `useEffect` keyed on `lastFeedback`, returning a cleanup that calls `clearTimeout`. | Eliminates the unmount-during-pause class of bug; correct React 19 pattern. | S | A12, D4 |
| H11 | Fix `RangesPage.tsx:389` `useMemo` deps. Pass `strategyProfile` (and whatever else `rangeValidationSummary` reads) into the deps array, or move the call into a Zustand selector. | Validator panel currently lies after a profile switch. | S | A13, D3 |
| H12 | Replace `parseFloat(seatMatch[3]!.replace(/,/g, ''))` with a locale-safe `int`-cents parser that handles both `,` and `.` thousand separators. | Closes A4 latent bug for any locale-formatted dump. | S | A4 |
| H13 | Wrap each route in `App.tsx` with its own `<ErrorBoundary>` (or a single one inside the `<Suspense>` fallback boundary). | A thrown error in HandReplay shouldn't blank the entire app. | S | D2 |
| H14 | Investigate whether `cbetHU` (`scenarioDetector.ts:189`) should subtract all-in preflop participants from `flopPlayerCount`. Add a fixture test for "open + 3-bet shove + call → flop HU vs no-action all-in player." | The "C-bet HU 100%" leak is the highest-priority leak per CLAUDE.md; getting its denominator wrong corrupts the most important stat. | M | A8, G2 |
| H15 | Remove or document `db.version(4).stores({})`. If it's a sentinel, add a code comment so the next agent doesn't accidentally collide. | Small but cheap; prevents future merge surprises with three AI tools editing in parallel. | S | A16, F8 |

---

AUDIT_NEW.md written, 50 findings across 7 sections
