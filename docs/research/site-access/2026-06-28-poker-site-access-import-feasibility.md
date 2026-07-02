# Poker Site Access / Import-Source Feasibility Spike

Date: 2026-06-28  
Front: Site access / import-source feasibility  
Access posture: public docs/pages + current repo code only. No credential collection, no private poker-account access, no gameplay automation.  
Question: should site authentication come before `SpotPacket`, or should we build `SpotPacket` first?

> 2026-06-28 clarification: this spike answered a **product/import-source** interpretation of “auth.” The user clarified they meant **research access** to poker schools, GTO Wizard, and similar study sites so Hermes can extract product/domain knowledge. Keep this spike because source metadata still helps `SpotPacket`, but do not treat it as the requested research-auth lane.

## Verdict: PARTIAL — do export-source discovery first, not durable auth

Do **not** build full poker-site auth before `SpotPacket`.

Do build a small, local-first import-source layer before or alongside `SpotPacket`:

1. site/source capability metadata,
2. user-facing export guides,
3. per-room missing-context warnings,
4. folder/file import affordances,
5. `SpotPacket` fields for `sourceSite`, `sourceFileType`, `sourceAccessMethod`, and `missingContext`.

Authenticated inspection can come later and should be **user-driven**: the user logs into the poker client/site and handles MFA; the agent may observe/export only after authorization. The product should not store poker-site passwords or attempt to bypass client restrictions.

## Why this should precede the exact SpotPacket implementation

`SpotPacket` needs to know which fields are actually obtainable from real player exports:

- payouts / paid places,
- players remaining,
- current tournament position,
- bounty/PKO information,
- hand-history completeness,
- tournament summaries vs hand histories,
- rake/fees reliability,
- anonymous opponent naming,
- export retention windows.

This spike shows those fields vary a lot by room. Therefore the next code slice should not be “auth”; it should be a `SpotPacket` boundary that explicitly records source capabilities and gaps.

## Current app support from source

| Source | Current code status | Evidence | Product implication |
|---|---|---|---|
| PokerStars hand histories | Native parser | `src/parser/pokerstars.ts`; `siteIdentifier.ts` | Strongest first-class room. Best first folder/import guide. |
| PokerStars tournament summaries | Native summary parser | `src/parser/tournamentSummary.ts`; `siteIdentifier.ts` | Useful for finish/prize/bounty/buy-in, but not exact payout ladder. |
| GGPoker / PokerCraft hands | Native best-effort parser | `src/parser/ggpoker.ts`; `siteIdentifier.ts` | Useful but should be labeled lower confidence until more real fixtures. |
| GGPoker / PokerCraft summaries | Native summary route | `src/parser/ggpoker.ts`; `workerProcessor.ts` | Important because PokerCraft has separate game summaries. |
| Open Hand History JSON | Native parser | `src/parser/openHandHistory.ts` | Good bridge if a room/tool can export OHH. |
| WPN/ACR, iPoker, 888, partypoker, Chico, Winamax | Detected as known unsupported | `src/parser/siteIdentifier.ts`; tests | Product should explain “recognized but not yet supported” rather than silently trying GG/PokerStars parser. |

## Site/source matrix

| Room/source | How player obtains data | Auth needed for discovery? | Data useful for app | Current app support | Feasibility | Notes |
|---|---|---:|---|---|---|---|
| PokerStars | Enable/save local hand histories via client options/settings; hand-history request paths also exist. | No durable app auth; user may need client login to enable/export. | HH text; tournament summaries; buy-in/fee/prize/finish when summaries present. | Native HH + TS parser. | **Now** | Best first productized “connect your folder/export” flow. Public official/help pages were partially inaccessible to the scraper, but GTO Wizard and public PokerStars result snippets agree on local HH saving. |
| GGPoker / PokerCraft | PokerCraft inside logged-in GG client; select game/date/stakes/session; download hand histories and game summaries. | Yes for client access, but user-driven only. | HH; game summaries; session/tournament data; PokerCraft stats. | Native best-effort GG parser + summary route. | **Now, but caveated** | Official GG FAQ says PokerCraft has no standalone access, no email HH support, and downloads are limited to last 90 days. PokerCraft win/loss stats exclude rake. |
| 888poker | Enable “Save My Hand History” in User Settings → Game settings → Hand History; choose destination folder. | No durable app auth; user uses client. | Local HH text; some tournament state visible in client. | Known unsupported native text. | **Later** | Good candidate after real fixtures because official public page says local HH can be saved. |
| WPN / Americas Cardroom | ACR client settings wheel → Hand Histories → choose destination folders for hand histories and tournament summaries. | No durable app auth; user uses client. | HH + tournament summaries. | Known unsupported. | **High-value later** | Official ACR FAQ confirms both HH and tournament-summary destination folders. This may be a strong second native-parser target after PokerStars/GG. |
| partypoker | `.com` client: no local HH while playing; manual/exported or emailed/anonymized hands. Regional clients may save local HH if enabled. | Likely user-driven client/account access. | Exported/anonymized HH; tournament results often missing/unreliable in local files. | Known unsupported. | **Caveated later** | Public HM/Poker Copilot docs emphasize restrictions, anonymous exports, and missing tournament results. |
| iPoker skins | Enable “Store Hand History Locally” in client; files under skin/screen-name-specific local data path; English client often required by trackers. | No durable app auth; user uses client. | Local HH text. | Known unsupported unless OHH. | **Later** | Many skins/paths; native support needs fixtures per skin. |
| Ignition / Bovada / Bodog | Manual downloaded hands after play; PT docs say roughly 24h delay and about one-week availability; PT hand grabber is a separate paid/installed workflow. | User-driven only. | Downloaded hands can include all hole cards; anonymous naming differences. | Unknown/unsupported. | **Reference/later** | Retention/delay makes this a bad first auth target. Also avoid depending on paid grabbers. |
| Tracker exports: PT4/HM3/Hand2Note/DriveHUD/Poker Copilot | Export hands from tracker database as text. | Depends on user’s tracker, not poker-site auth. | Normalized HH export, often already cleaned. | Depends on output format; PokerStars/GG/OHH strongest. | **High-leverage later** | Might be more useful than direct site auth for users who already use trackers. |

## Auth boundary

Safe now:

- user selects local files/folders,
- app explains where each site usually saves exports,
- app parses known formats and refuses known unsupported formats honestly,
- user manually exports/downloads from the poker client,
- optional future agent-observed walkthrough after user logs in.

Not safe / not needed now:

- storing poker-site credentials,
- automated login/session scraping,
- bypassing client restrictions,
- automating gameplay or table interaction,
- claiming live HUD/tracker support,
- claiming exact ICM/solver support from incomplete room exports.

## Product ideas from the site-access pass

1. **Import-source chooser**
   - “PokerStars local folder”, “PokerStars tournament summaries”, “GGPoker PokerCraft export”, “ACR/WPN folder”, “Tracker export”, “Other/unknown”.
   - Each option shows expected file types and caveats.

2. **Recognized-but-unsupported state**
   - Current `siteIdentifier.ts` already detects WPN/ACR, iPoker, 888, Party, Chico, Winamax markers.
   - UI should surface this as: “Recognized room, parser not yet supported — upload a sanitized contribution package or choose OHH/tracker export.”

3. **Source capability metadata**
   - Attach to imports: `site`, `fileType`, `accessMethod`, `retentionWindow`, `hasTournamentSummary`, `hasPayouts`, `hasBountyInfo`, `hasRake`, `confidence`.

4. **SpotPacket source fields**
   - Add source fields before solver exports:
     - `sourceSite`
     - `sourceFileType`
     - `sourceAccessMethod`
     - `sourceParserConfidence`
     - `missingContext[]`
   - This prevents HRC/ICMIZER packets from silently implying payout/ICM context that the room did not export.

5. **Fixture-request workflow**
   - For unsupported rooms, ask for sanitized samples using the existing privacy-safe contribution pathway rather than building auth.

## Recommended next code slice

Build `SpotPacket` **with source capability fields**, not poker-site auth.

Suggested acceptance criteria added to the previous SpotPacket plan:

1. `SpotPacket.source.site` supports at least `pokerstars`, `ggpoker`, `open_hand_history`, `known_unsupported`, `unknown`.
2. `SpotPacket.source.fileType` distinguishes `hand_history` vs `tournament_summary` vs `tracker_export` vs `manual_entry`.
3. ICM-sensitive packets carry warnings such as `missing_payouts`, `missing_players_remaining`, `missing_paid_places`, and `source_summary_missing`.
4. Packets from GG include a `rake_excluded_or_unknown` warning unless rake is explicit.
5. Packets from unsupported recognized rooms are not produced as solver-ready; they become import-support/contribution prompts.

## When to use authenticated site access later

Use authenticated access only after one of these is true:

- we need to observe PokerCraft / PokerStars / ACR client UI after public docs are insufficient,
- the user has a site open and explicitly wants a guided export walkthrough,
- we are validating exact file availability for the user’s most-used room,
- we are designing screenshots/copy for a local import guide.

At that point the user should log in and handle MFA directly. Hermes can inspect the visible UI, but should not ask for or store credentials.
