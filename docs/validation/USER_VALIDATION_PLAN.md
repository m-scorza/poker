# User Validation Plan

**Created:** 2026-05-10
**Status:** planned, not yet executed
**Purpose:** satisfy the council's external-user validation gate before choosing another product/feature sprint.

## Current product posture for demos

Until third-party curriculum licensing/IP status is resolved, present this as:

> A private/local poker hand-history analyzer that helps a player find leaks and prioritize study from their own hand histories.

Do **not** present it as:

- An official third-party curriculum companion.
- A third-party curriculum product.
- A tool licensed by a third-party curriculum owner.
- A paid SaaS ready for public sale.
- A shareable curriculum-artifact generator.

## Validation cohort

Run six short demos/interviews:

| Group | Count | Notes |
|---|---:|---|
| training-community students | 3 | Useful target-user proxy, but avoid claiming third-party curriculum affiliation or curriculum rights. |
| Independent poker players | 3 | Control group to test whether the product has value outside third-party-curriculum-specific framing. |

## Success criteria

The next sprint can be chosen only after recording answers to these questions:

1. Can the user understand what the app does within 2 minutes?
2. Can the user upload/import or understand the demo flow without hand-holding?
3. Which screen produces the first "oh, that's useful" moment?
4. Which metric/explanation is confusing, distrusted, or ignored?
5. Would the user return after their next session/tournament?
6. Would the user pay, and if so for what exact outcome?
7. Does the user care more about leak analysis, study queue, bankroll/career insights, villain tracking, or training drills?
8. Does the absence of their preferred poker site block use?
9. Does any current strategy wording feel too tied to third-party curriculum or another coach's IP?

## Demo script

### Opening

```text
I'm testing a private/local poker hand-history analyzer. It imports tournament hand histories and tries to turn them into leak analysis and study priorities. This is not an official third-party curriculum product and I'm not asking you to buy anything today. I mainly want to see where it is useful, confusing, or wrong.
```

### Observe without explaining too much

Ask the participant to share screen if possible. Then:

1. Show the dashboard/demo state.
2. Ask: "What do you think this app is telling you?"
3. Ask: "Where would you click first?"
4. Let them explore for 3-5 minutes.
5. Do not defend the UI; write down confusion.

### Core questions

```text
1. What is the most useful thing you saw?
2. What is the most confusing thing you saw?
3. Which result would you trust enough to study from?
4. Which result would you not trust yet?
5. If you uploaded your own hands, what would you expect the app to tell you first?
6. What would make you come back after your next session?
7. Would you pay for this if it worked on your own hands? If yes, what price feels reasonable? If no, why not?
8. What poker site/app do you need it to support?
9. Are any explanations too coach/curriculum-specific or legally/ethically questionable?
```

### Closing ask

```text
Can I follow up after I fix the top issues you found and ask you to try it with your own hand histories?
```

## Recording template

Create one entry per interview below or in a separate dated note.

```md
## Participant N — YYYY-MM-DD

- Segment: training-community student / independent player
- Stakes / format:
- Poker sites used:
- First useful moment:
- Biggest confusion:
- Trust blockers:
- Feature they cared about most:
- Payment reaction:
- Required site support:
- IP/curriculum concern mentioned:
- Follow-up permission: yes/no
- Raw quotes:
- Sprint implication:
```

## Decision rule after six demos

Use the evidence to pick one sprint:

- If users distrust parser/import accuracy: continue Import Reliability + Data Confidence.
- If users understand analysis but want clearer next actions: improve Study Queue / explanations using generic language.
- If users cannot import their site: consider one platform-support sprint, but only for the most-requested room.
- If users want the app and ask how to pay after using it: harden funnel/payment, but only with generic positioning unless licensing is resolved.
- If users are confused by all strategy/curriculum framing: pivot language toward generic poker analytics and remove third-party-curriculum-specific assumptions from user-facing copy.
