# GTO Wizard Analyze / Upload Workflow Pass 04

Date: 2026-06-28  
Source posture: user-authorized private/tool workflow evidence  
Usage status: safe-to-implement-as-abstraction for workflow/config/design concepts; not public evidence; not direct reuse of proprietary strategy data.

## Why this pass happened

The user pointed out Hermes looked idle. The 30-minute cron job had run successfully, but because this session is the Hermes TUI and the job uses `deliver: local`, cron output is saved in cron history rather than pushed into the active chat. The cron schedule was also tightened from natural-language `every 30m` to exact cron syntax `*/30 * * * *` so the next run lands predictably on half-hour boundaries.

Immediate live work continued in this session.

## RegLife ICM target status

Attempted target:

- RegLife `MTT Elite` / Risk Premium page with `moduleId=470`
- Intended PDF: `Reg Life - ICM NA PRÁTICA.pdf`

Observed blocker:

- The RegLife tab was reachable but stuck on a skeleton/loading state.
- DOM body length stayed `0` after reload.
- No PDF links were available to CDP.

Decision: do not stop. Continue with currently reachable GTO Wizard workflow extraction and leave RegLife ICM PDF as the next authenticated-page target once the tab loads or the user refreshes/reopens it.

## GTO Wizard Analyze workflow extraction

Starting from the authenticated GTO Wizard preflop solutions page, Hermes clicked/inspected the Analyze route without uploading files or changing account settings.

Observed Analyze route:

- Path family: `/analyze/v4/hands/table`
- Page title: `Hands - GTO Wizard`
- Main workflow tabs/sections:
  - `HANDS`
  - `RESULTADOS`
  - `STATS`
  - `REPORTS`
  - `UPLOADS`
- Top-level nav retained:
  - `Play`
  - `Study`
  - `Practice`
  - `Analyze`
  - `Upload`
- Variant switcher retained:
  - `Hold'em`
  - `PLO`
- Stable selectors retained:
  - `analyze-menu-opener`
  - `upload-button`
  - `study-menu-opener`
  - `practice-menu-opener`
  - `variant-switcher-nlholdem`

## Product implications

### 1. Analyze should be a workspace, not just a report

GTO Wizard's Analyze area splits uploaded/parsed hands into multiple work modes:

- individual hands/table view,
- results,
- stats,
- reports,
- uploads.

Our app should mirror the workflow abstraction without copying proprietary internals:

```text
Upload → Data Health → Hands Table → Results/Stats → Reports → Study Queue → Hand Review
```

This supports the existing roadmap direction: upload is only the beginning, not the product's main page.

### 2. Upload status deserves its own first-class surface

The visible `UPLOADS` tab means upload/import state is part of the analysis cockpit. For us, that should become a `Data Health` / `Import Runs` surface showing:

- file/source type,
- parser confidence,
- site/source warnings,
- hands parsed/skipped,
- missing tournament context,
- duplicate/import-run status,
- source-specific caveats.

### 3. Keep Study / Practice / Analyze connected

GTO Wizard keeps `Practice this spot` close to solver/study content. For us, the abstraction should be:

- leak or hand finding → spot packet → trainer card / study queue item → progress tracking.

This is the bridge between imported hands and the future trainer.

### 4. Stable selectors are a product quality feature

The `data-tst` attributes make GTO Wizard easy to test and inspect. Our equivalent should use stable selectors for:

- upload button/status,
- analyze workspace tabs,
- hand table rows,
- study queue cards,
- spot source/config panel,
- trainer legal-action buttons,
- evidence labels/warnings.

## Claims generated

- `C-PB-GTOW-003`
- `C-UX-GTOW-ANALYZE-001`

## Safe implementation candidates

1. Add a neutral `AnalyzeWorkspace` product model in docs/design/plans before UI code:
   - Data Health
   - Hands
   - Results
   - Stats
   - Reports
   - Uploads
   - Study Queue

2. Extend existing import/source docs and `SpotPacket` plan to connect:
   - imported file/source metadata,
   - parser confidence,
   - study packet/export packet,
   - trainer spot card.

3. Add stable selectors to any new UI slice from the start.

## Next targets

1. Refresh/reopen RegLife Risk Premium page and retry `ICM NA PRÁTICA.pdf` extraction.
2. Inspect GTO Wizard `Uploads` tab deeper if the UI exposes upload-state examples without requiring an actual file upload.
3. Inspect GTO Wizard `Practice this spot` workflow, but do not start paid/account flows or submit irreversible state.
