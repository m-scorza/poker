# User-Authorized Poker Knowledge Access Protocol

Date: 2026-06-28  
Front: Poker brain / user-authorized private research  
Scope: poker schools, paid/private training libraries, authenticated GTO Wizard areas, and other user-authorized study platforms.  
Clarification: this is **research access**, not app authentication to poker rooms.

## Correction from the user

When the user asked about “auth,” the intended meaning was:

> user-authorized access to poker schools, GTO Wizard, and similar study sites so Hermes can extract product/domain knowledge.

It did **not** mean:

> building authentication into the poker analyzer app for PokerStars, GGPoker, ACR, or other poker rooms.

The previously built `SpotPacket` and site/import-source metadata still help because they make future solver/export/study outputs honest about source, missing context, and solver-backed status. Keep them. But the next research-auth lane should target knowledge extraction from authorized study sources, not poker-room login automation.

## Operating rules

## RegLife authorization note

The user states they have express approval from RegLife to use the curriculum **brand-neutrally** for this project. Treat RegLife materials as `user-authorized licensed-private` rather than merely internal reference. That permits turning curriculum charts/ranges/concepts/wording into product logic, tests, study content, and neutral UI copy when useful, while still recording source provenance and avoiding unnecessary RegLife branding unless explicitly requested.

Important distinction: licensed/private-source evidence can be authoritative for this product, but it is not the same as `public` evidence unless the material is publicly available. In ledgers, label it as `licensed-private` / `user-authorized licensed`, not `public`.

Safe approach:

1. User logs in directly and handles MFA/passwords.
2. Hermes may inspect pages after the user-authorized session is visible.
3. Treat authenticated content as `user-authorized private` unless a page is public, or as `user-authorized licensed-private` when the user states explicit permission for use.
4. Record source metadata, claims, license/permission scope, and whether the material may be used directly, brand-neutrally, or only as an abstraction.
5. For RegLife, use the approved curriculum brand-neutrally when it improves product logic, explanations, tests, drills, or study workflows.
6. For other private sources without explicit reuse permission, translate findings into original abstractions: concepts, caveats, UI patterns, test needs, drill ideas, and validation questions.
7. Keep credentials and unrelated private account data out of docs, diagnostics, and source control.
8. Stop if a site blocks automation, shows DRM/paywall restrictions, or would require bypassing access controls.

Not safe:

- asking the user for passwords or MFA codes,
- storing credentials,
- bypassing paywalls, DRM, rate limits, or bot protections,
- downloading/scraping private videos or files beyond normal user-authorized viewing/export,
- copying proprietary material from sources where no permission/license has been stated,
- labeling licensed/private-source claims as `public` evidence when the underlying material is not publicly available.

## Source classification

| Source class | Examples | Allowed use | Product use |
|---|---|---|---|
| Public | public GTO Wizard blogs/help, public poker articles | quote/paraphrase with attribution | safe-to-quote or safe-to-implement-as-abstraction |
| User-authorized licensed-private | RegLife curriculum per user-stated express approval | extract, adapt, and implement brand-neutrally within stated permission scope | usable for product logic/copy/tests; cite internally as licensed-private, not public |
| User-authorized private | poker school videos/dashboards, paid drills, authenticated GTO Wizard tools | inspect/summarize internally after user login | internal-reference-only unless explicit license allows more |
| User-provided exports | screenshots, notes, CSVs, PDFs the user provides | analyze according to user direction | usually internal-reference-only; extract abstractions |
| Generated synthesis | Hermes/Antigravity summaries | never standalone evidence | must point back to source rows |

## Extraction workflow

For each authenticated source/session:

1. **Inventory**
   - platform name,
   - account/session status: user-authorized,
   - content type: video, article, range chart, quiz, solver drill, hand-history analyzer, dashboard,
   - source URL or stable label,
   - access restrictions / license posture,
   - direct-use permission: none / abstraction-only / brand-neutral direct use / explicit quote allowed.

2. **Capture safe metadata**
   - title/topic,
   - module/category,
   - date if visible,
   - high-level concept tags,
   - whether raw charts/range grids are allowed to be retained or transformed under the permission scope.

3. **Normalize into claims**
   - claim,
   - source ID,
   - confidence,
   - IP status,
   - product implication,
   - validation path.

4. **Turn into product candidates**
   - explanation/caveat copy in original language,
   - parser/test fixture needs,
   - study queue logic candidates,
   - drill designs,
   - UI workflow patterns,
   - solver/SpotPacket requirements.

5. **Verification before shipping**
   - cross-check against public sources, app code, user-provided data, or solver/manual validation where possible.
   - keep unsupported private-only claims out of grading logic until independently validated.

## Candidate first targets

| Target | Why first | What to extract | Boundary |
|---|---|---|---|
| GTO Wizard public + authenticated study/analyzer views | Solver-backed workflow, status taxonomy, EV-loss prioritization, drill UX | workflow patterns, caveats, unsupported/partial statuses, study filters | Public pages can be cited; authenticated outputs should be treated as private/tool result unless export/license allows more. |
| RegLife materials | Expressly approved by user for brand-neutral curriculum use | concept map, ranges/charts where useful, leak taxonomy, lesson sequence, drills, copy/tests/logic candidates | Licensed-private: can be used brand-neutrally for this product; record source IDs and permission scope. |
| Other poker schools | Domain vocabulary, lesson sequencing, common student leaks, study priorities | concept map, leak taxonomy, drill ideas, questions for validation | Internal-reference-only unless licensing exists; keep UI generic and non-branded. |
| HRC / ICMIZER authenticated tools if available | Exact preflop/ICM validation workflow | setup requirements, exported result metadata, assumptions needed for SpotPacket | Do not claim solver-backed until actual output/result metadata is captured and licensed for use. |

## Deliverable template

Create private-source notes under `docs/research/poker-brain/` only as source-governed summaries, not raw dumps:

```md
# <Platform> Knowledge Access Session — <topic>

Source posture: public / user-authorized private / user-authorized licensed-private / user-provided  
Usage status: internal-reference-only / safe-to-implement-as-abstraction / licensed-brand-neutral-use / safe-to-quote  
Raw material retained? no / yes, within license scope

## Inventory
- Source labels:
- Content types:
- Access restrictions:

## Concepts extracted
- ...

## Claims ledger candidates
| Claim | Evidence | Confidence | IP status | Product implication |
|---|---|---|---|---|

## Implementation candidates
- ...

## Validation needed
- ...
```

## Next practical step

Proceed with public-source preparation now. Pause only when actual private login/MFA is required.

When the user has a school/GTO Wizard page open and logged in, Hermes should inspect the visible page and record source-governed notes. For RegLife, use the user-stated brand-neutral permission. For other private sources, default to abstraction-only unless the user states a permission scope.
