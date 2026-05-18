# 2026-05-18 — Downstream Trust & Import Timeline Plan

**Goal:** Propagate the data-health confidence state into downstream analysis views and provide a collapsible, warning-detailed import run history.

---

## 1. Downstream Trust Propagation

We will dynamically fetch recent import runs via Dexie and display context-aware warnings on:
- **LeaksPage**: Alerting the user if low/medium confidence suggests incomplete or directional leak prioritize indicators.
- **CareerPage**: Informing the user if metrics like Profit/ROI/ABI may be incomplete.

### LeaksPage Alert Design
- **Amber Warning Alert** (for `medium` confidence): 
  - *Icon:* `AlertTriangle`
  - *Text:* `"Directional Analysis: Your latest import completed with minor warnings. Statistics are highly useful but should be treated as directional."`
- **Red Danger Alert** (for `low` confidence):
  - *Icon:* `AlertTriangle`
  - *Text:* `"Action Required: Your latest import encountered significant warnings/failures. Downstream leak analysis and career charts may be incomplete or biased."`

### CareerPage Alert Design
- Matching alert cards displayed at the top of the Player Career page.

---

## 2. Collapsible Warning History & Timeline

Inside `HandsUpload.tsx`:
- Render an interactive **"Show Import History"** expander button inside the Data Health panel.
- On click, expand a vertical timeline representing the last 5 runs.
- For each run, display:
  - Time of import (relative or absolute).
  - Status dot: emerald (high), amber (medium), rose (low).
  - High-fidelity stats: `"Saved 120 hands / 2 summaries (3 files, 1 failed)"`.
  - A scrollable list of specific warnings if present.

---

## 3. Verification Path

```bash
npm run docs:update
npm run docs:check
npx tsc -b --pretty false
npm test
npm run build
```
