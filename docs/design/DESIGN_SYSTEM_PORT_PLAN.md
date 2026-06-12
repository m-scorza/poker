# Design System Port — Claude Code Plan

> **What this is.** The execution plan to reskin the poker app from its current
> "neon HUD" theme to the **ratified "precision instrument" design system**
> (ratified 2026-06-09 in the Design Lab repo). This is the "merge": not a git
> merge of two repos, but porting one design system into this app, page by page.
>
> **Canonical sources (these win over this file):**
> - Pixel reference: `design-system/reference/Command Desk R.html` (Design Lab repo). **When prose and pixels disagree, pixels win.**
> - Contract: `docs/design/DESIGN.md` (copy in step 0)
> - Decisions + rationale: `docs/design/DECISIONS.md` (copy in step 0)
>
> Design Lab source archive: local-only design workspace.
> `design-system/` is the source folder; `archive/` is exploration history (quarry, don't extend).

---

## 0 · Prerequisites (do these before any code)

1. **Clear the stuck git index.** `poker/.git/index.lock` was present during planning.
   If no git/Claude Code/editor process is mid-operation: `rm -f .git/index.lock`.
2. **Start from clean `main` on a feature branch:**
   ```
   git checkout main && git pull
   git checkout -b ui/design-system-port
   ```
   (`main` is protected — everything lands via PR. One PR per slice below.)
3. **Copy the design-system files in** (from the Design Lab repo):
   - `design-system/DECISIONS.md` → `docs/design/DECISIONS.md`
   - `design-system/DESIGN.md`    → `docs/design/DESIGN.md`
   - `design-system/tokens.css`   → `src/styles/tokens.css`  *(new folder)*
   - Keep `design-system/reference/Command Desk R.html` open in a browser the whole time.

> Note: `graphify-out/` (≈2,006 generated files) stays tracked for now — explicitly deferred,
> not part of this work. Revisit gitignoring it later.

---

## The guardrails (13 decisions, compressed)

Full reasoning in `docs/design/DECISIONS.md`. The non-negotiables:

- **D2 — one palette, ink-mono dark.** Near-black chassis `#0a0a0c`/`#111114`, white-silver type, **silver `#C9CDD6` is the interactive accent.** No theme switcher, no second palette. Light mode is parked.
- **D3 — violet `#9B6CFF` is signature-only.** Appears at *user presence + wayfinding*: cursor halo, text selection, focus rings, live pulse, active nav tick, active tab underline, breadcrumb current, CTA arrows, loader. **Never** on surfaces, resting borders, charts, data, body text, icons.
- **D4 — color is meaning.** Money-positive is **always green `#34D98C`**. Loss `#FF5468`. Warn = loss one intensity stop down (see discrepancy note below). Semantics are saturated *because* the chassis is quiet.
- **D5 — surfaces are tone shifts, not boxes.** Compartment = `bg → bg-2`, **border:0**, no glass, no blur. Internal structure = 1px hairlines. **The jewel budget is exactly one element per screen** that may keep glass + glow (on the Desk: the sidebar lifetime-profit block, green money-glow). A second jewel demotes the first.
- **Type** — `font-display` Bricolage Grotesque (monuments/titles), `font-sans` Inter (reading), `font-mono` JetBrains Mono (all numerals, kickers, tables). Scale contrast is the drama; `tabular-nums` global.
- **The kicker system** — every section label is uppercase mono 9–11px, letter-spacing 0.12–0.2em, `fg-muted`. This is the connective tissue; use it everywhere a label appears.

### ⚠️ Discrepancies to resolve with a human (don't silently pick)

1. **Warn color.** `DECISIONS.md` D4 says amber `#E0AC4E`; the shipped `tokens.css` and `DESIGN.md` say dusty mauve-rose `#A5697B` ("severity is intensity, not a new hue"). **Tokens are the install artifact → use `#A5697B`** and flag it in the PR for Matheus to confirm.
2. **No `info` blue in the new system.** The old theme had `--color-info #007bff`. The new system has no info hue (blue `#5AA2FF` is *diamonds only*). Audit each `info` usage and map to `fg-muted` or `accent`, or remove. Flag any genuinely-needed ones.

### Anti-patterns — instant review rejection

Violet gradients as decoration · outlined cards · glow on borders or chart strokes · a second jewel per screen · inventing new accent hues · non-tabular numerals in data · animation with no function · adding a theme/palette option · building a component without a page that needs it.

---

## Token migration map (old `src/index.css` → new `tokens.css`)

The old `@theme` block stays in place during the migration so nothing breaks; you migrate
page by page, then delete it in the final slice. Replacement table:

| Old token / utility | New | Notes |
|---|---|---|
| `--color-bg #050505` | `ink #0a0a0c` | canvas |
| `--color-bg-card` (glass rgba) | `.compartment` (`ink-2 #111114`) | **drop the glass** — tone shift, no blur/shadow |
| `--color-bg-sidebar` (frosted) | flat `ink` + hairline right edge | sidebar is not a glass panel anymore |
| `--color-bg-hover` | `ink-3 #16161a` | hover = one tone lighter |
| `--color-bg-input` | `input #131316` | |
| `--color-border .06` | `hairline .07` | |
| `--color-border-active .15` | `hairline-strong .16` | |
| `--color-text #f0f0f5` | `fg #f2f2f4` | |
| `--color-text-dim` | `fg-muted #8b8d94` | |
| `--color-text-muted` | `fg-dim #56585f` | |
| `--color-accent #00e676` (neon green) | **SPLIT** | this token did double duty — see below |
| `--color-accent-dim` | `accent-line` / `money-line` | depends on use |
| `--color-danger #ff3366` | `loss #FF5468` | |
| `--color-warning #ffb700` | `warn #A5697B` | see discrepancy #1 |
| `--color-info #007bff` | — | see discrepancy #2 |
| `--color-suit-spade/heart/diamond/club` | `spade/heart/diamond/club` | values shift slightly; use new |
| `--color-range-in/out/neutral` | matrix encoding in `DESIGN.md` | `color-mix(accent 26%, ink-2)`, `loss-soft`, etc. |
| `@utility glass-card` (17 files) | `.compartment` / `.compartment-hover` | **except the one jewel per screen** |
| `@utility glass-sidebar` (1 file) | flat sidebar | |
| `@utility font-data` (26 files) | `font-mono` (tabular-nums is global now) | |
| entrance keyframes (`fade-in`/`slide-up`/`zoom-in`) | Motion (already a dep) | per DESIGN.md motion budget |

**The critical disambiguation — old `--color-accent` (neon green) was used as BOTH the interactive accent AND "money/up".** The new system separates them hard:
- interactive-at-rest (links, controls, focusable chrome) → **silver `accent #C9CDD6`**
- money / positive / "you're up" → **green `money #34D98C`**

Every old `accent` usage must be classified as one or the other. When in doubt: is it conveying *money*? green. Otherwise silver.

---

## Fonts (local-first — no external CDN)

The repo posture is "no external API calls by default" + PWA. **Do not** add Google Fonts `<link>` tags. Use `@fontsource` npm packages so fonts ship with the bundle:

```
npm i @fontsource/bricolage-grotesque @fontsource/inter @fontsource-variable/jetbrains-mono
```
Use local/system font fallbacks only unless fonts are self-hosted in the repo. Do not add remote font URLs; Bricolage, Inter, and JetBrains Mono are preferred when already available locally.

---

## Slice plan (one PR each, against `main`)

Every PR must pass the repo's required check before merge:
```
npm run docs:check && npm run typecheck && npm run lint && npm test && npm run build
```
(plus `npm run privacy:check` if you touch parser/data; run `npm run docs:update` if you change deps/routes/the `src/` tree, or the pre-commit hook will block you.)

### PR 1 — Foundation (additive, no visual change yet)
- Copy the 3 design-system files (step 0.3). Add `@import "./styles/tokens.css";` right after `@import "tailwindcss";` in `src/index.css`.
- Add the `@fontsource` deps + imports. Run `npm run docs:update` (deps changed).
- **Done when:** tokens + fonts load, `bg-ink`/`text-money`/`font-display`/`.kicker` resolve, app still renders in the old theme (both token sets coexist), CI green.

### PR 2 — Chassis + kickers (design-map step 1)
- App shell + sidebar: flat `ink`, hairline right edge, remove `glass-sidebar`. Active nav item gets the 2px-inset violet tick (D3). Migrate the kicker/label system to `.kicker` everywhere.
- Global: dot-grid background (`rgba(255,255,255,0.035)`, 28px, radial mask), recolor scrollbars to hairline, table-row hover → `ink-3`.
- **Done when:** chassis matches Command Desk R, sidebar is flat, kickers are consistent, no glass except (later) the jewel. CI green.

### PR 3 — The Desk (Dashboard)
- Reskin `DashboardPage` to tone-shift compartments + hairlines. Build **the one jewel**: sidebar lifetime-profit block, green money-glow (`--shadow-jewel`). Hero monument number (Bricolage, clamp scale) with Motion count-up. Reference implementations (verdict gauge, ring HUD, positional felt ring, alert log) live in Command Desk R.
- **Done when:** one jewel only, money is green, monument/equity styling matches reference. CI green.

### PR 4 — Range matrix (13×13)
- The single most important poker surface. Implement the monochrome frequency encoding from `DESIGN.md` (in/mixed/leaking/fold). Violet never appears here; yellow never appears here. Used by Ranges page + leak panels.

### PR 5–N — Per-page reskins (one PR each)
Hands · Leaks · Sessions · Villains · Arena · Career. Each: migrate `glass-card`→`compartment`, `font-data`→`font-mono`, old colors→new per the map. Each page gets at most one jewel.

### Final PR — Retire the old theme
- Remove the old `@theme` block, glass utilities, and dead keyframes from `src/index.css`. `grep` confirms zero references to `glass-card`, `glass-sidebar`, `font-data`, and the old color tokens. CI green.

---

## Suggested kickoff prompt for Claude Code (in the poker repo)

> Read `docs/design/DESIGN_SYSTEM_PORT_PLAN.md`, `docs/design/DESIGN.md`, and
> `docs/design/DECISIONS.md`. Open `Command Desk R.html` from the Design Lab repo as the
> pixel reference. Do PR 1 (Foundation) only: copy tokens, wire the import, add the
> `@fontsource` fonts, run `npm run docs:update`, and confirm the full CI gate passes with
> the app still rendering in the old theme. Do not start visual changes yet. Flag the two
> discrepancies (warn color, info blue) in the PR description.
