# design-sync notes — poker-analyzer

## Re-sync risks (watch-list for the next run)

- **The compiled-CSS dependency is the big one**: `cfg.cssEntry` is the app's Vite build output. Any app change that adds/removes Tailwind classes changes `_ds_bundle.css` — always re-run `buildCmd` before the converter, and expect component styling to drift with app styling (by design: the DS ships what the app ships).
- The previews inline realistic data (nav items render from the app's real `NAV_ITEMS`; range/matrix data is hand-built in the preview files). If `CommandPalette` nav or the `RangeCellData`/`getCellStatus` shapes change in src, the previews compile-fail or render stale — fix the `.tsx`, don't fork config.
- `.ds-sync/` is gitignored and staged from the skill: on a fresh clone re-copy scripts, `npm i` converter deps, and `npm i playwright@1.60.0` into `.ds-sync` (or re-match the chromium cache, see pin note below).
- Grades/verdicts live in the uploaded `_ds_sync.json` (project 8e1445ad-1a32-4837-8167-bab39a580638) — fetch it as the anchor; nothing verification-related is in git.
- Partially verified: hover/press states (InfoTooltip body, DualRangeMatrix insight pane, row hovers) can't render statically and were never captured.
- Toolchain assumptions: node from repo root, npm, Vite 8, Tailwind 4 CSS-first; no network fetches at build time (fonts are local packages).

- This is an app repo, not a packaged DS. The synced "design system" is `src/components/shared/` (8 components), exported via the hand-written barrel `.design-sync/ds-entry.ts` passed as `cfg.entry`. `DemoDataButton` is excluded (imports Dexie seeding + Zustand appStore).
- No library build: compiled Tailwind 4 CSS comes from the app build. `buildCmd` runs `vite build --base=./` (relative asset URLs so `@font-face` urls resolve next to the CSS) then copies the hashed `dist/assets/index-*.css` to the stable path `dist/assets/app-compiled.css` (= `cfg.cssEntry`). Re-run `buildCmd` before every converter run.
- `CommandPalette` needs a router context (its tests wrap `MemoryRouter`); `MemoryRouter` is re-exported from the barrel and set as `cfg.provider` for all previews (context-only, harmless for the rest).
- Tokens: `src/styles/tokens.css` (Tailwind 4 `@theme`) + short aliases (`--fg`, `--money`, `--ink-2`…) defined in `src/styles/reinterpretation.css`. Both are inside the compiled app CSS.
- Fonts: Bricolage Grotesque ships via @fontsource (in compiled CSS). `--font-sans: Inter` and `--font-mono: JetBrains Mono` are referenced but the app never ships them (system fallbacks) — expect `[FONT_MISSING]` discussion.
- There is no `DataHealthAlert` component — `DataHealthAlert.tsx` exports `DataHealthAlertIcon` + a tone-class helper. The synced component is `DataHealthAlertIcon`.
- Render check: playwright must match the cached chromium build (`$LOCALAPPDATA/ms-playwright`). playwright@1.60.0 ↔ chromium-1223 verified 2026-07-19; installed in `.ds-sync/node_modules` (gitignored — reinstall on fresh clone).
- Fonts: Inter + JetBrains Mono bundled via `@fontsource/*` devDeps (owner-approved 2026-07-19), wired through `cfg.extraFonts` (weights 400/500/600/700 Inter, 400/500/700 JBM).
- Known render warns (triaged):
  - `[FONT_MISSING] "Bricolage Grotesque"` — fallback alias only; the shipped face is "Bricolage Grotesque Variable", first in the `--font-display` stack. Not a real gap.
- Floor-card render throws for PokerCard (`card.toLowerCase`), RangeGrid (`getCellStatus is not a function`), DualRangeMatrix (Map prop `.get`) are crash-prevention default-prop gaps — authored previews with real props are the fix, not config.
- WAVE1 findings (2026-07-19, all fixed in src): semantic tokens were `body[data-shell]`-scoped in `reinterpretation.css` — widened to `:root, body[data-shell]` (and `:root, body[data-font="hybrid"]` for font vars) so tokens resolve in previews AND rendered designs; app precedence unchanged. `Card.tsx` used nonexistent classes (`text-suit-*`, `bg-bg-card-solid`, `border-border-active`) — renamed to real tokens (`text-heart/diamond/club/spade`, `bg-card-surface`, `border-hairline-strong`). Config `overrides` edits after a full build trip CONFIG_STALE in preview-rebuild — orchestrator must re-run package-build after any config change.
- Components consume the *alias* tokens via arbitrary values (`text-[var(--money)]`), not the `@theme` utilities (`text-money`) — so the `:root` widening of `reinterpretation.css` is what makes them portable; `tokens.css` `@theme` vars were always `:root`-scoped and fine.
- Preview harness `.ds-cell` chrome is white/light-gray; on this dark-first DS it shows around components that don't paint their own surface. Cosmetic, not a blocker.
- Framer-motion `AnimatePresence` entries (ConfirmDialog, CommandPalette) capture blank: the capture harness freezes the clock, so `initial opacity:0` never animates away. Fix pattern: barrel re-exports `MotionGlobalConfig` (same framer instance as the bundle); the affected preview `.tsx` sets `MotionGlobalConfig.skipAnimations = true` at module top. Never import framer-motion directly in a preview (separate bundled copy — flag won't reach components).
- Preview-authoring rules (WAVE2 calibration, keep for future components):
  - Harness cell background is white; components with near-transparent surfaces (RangeGrid out-of-range cells) need a `var(--ink)` dark backdrop wrapper in the preview — legitimate framing, not a workaround.
  - Never tint a preview wrapper with a `-soft` token alone (10% color over white = washed out + invisible light text); layer on solid `var(--ink-2)` first.
  - Preview `.tsx` is esbuild-bundled, NOT scanned by the app's Tailwind build — new utility classes won't generate CSS; use inline styles with `var(--*)` tokens for framing.
  - Hover/internal-state UI (InfoTooltip body, DualRangeMatrix insight pane) can't be prop-forced; compose the trigger in labeled context and note the limit in the grade.
  - `RangeGrid.getCellStatus` is required (returns `in-range|out-of-range|played-correct|played-deviation|not-dealt`); `DualRangeMatrix.data` must be a real `Map` of fully-shaped `RangeCellData` (plain object throws).
  - CommandPalette has no prop-controllable variant axis → single `Open` export is the correct recipe.
- Known render warns (triaged, cont.): ConfirmDialog card shows the dialog slightly clipped at top in single-card viewport (centered overlay taller than frame; content legible — tried 560x560 on 2026-07-19 — WORSE: taller viewport pushes the centered overlay further above the fixed capture crop. Keep 560x480; taller viewports do not improve overlay framing here).
- Resolved watch item: `PokerCard` classes `text-suit-*`, `bg-bg-card-solid`, `border-border-active`, `patterned-bg` — verify they exist in the compiled CSS (defined in desk.css/blackout.css?); if Tailwind never generated them, the card renders unstyled in previews too.
