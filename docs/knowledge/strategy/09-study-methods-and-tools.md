# 09 — Study Methods and Tools

## 1. Study Methods Overview [Vol.1]

| Method | Description | Best For |
|---|---|---|
| **Technical lessons** | Structured courses on specific topics | Building foundational knowledge |
| **Saving doubt hands** | Screenshot hands you're unsure about | Targeted learning from real play |
| **Session review** | Review the previous day's session with fresh eyes | Finding leaks and emotional patterns |
| **Watching other players** | Observe live streams, replays | Learning new strategies (use critically) |
| **Study groups** | Discuss hands with peers at similar level | Accelerated learning through debate |
| **Solver work** | Run hands in PioSolver, GTO Wizard, HRC | Understanding theoretical baselines |
| **Drills** | Practice vs. bots with scoring | Internalizing correct decisions |
| **Leak Finder (MDA)** | Statistical analysis of your own database | Identifying systematic errors |

---

## 2. Study Progression

### Beginner Path [Vol.1]

**Step 1**: Establish fundamentals — poker math, equity, range interpretation, what to avoid.

**Step 2**: Master pre-flop — define your opening ranges, know what NOT to play by position.

**Step 3**: Understand opponent reactions — when to call, when to 3-bet, when to fold vs raises.

**Step 4**: Interpret all-in situations — math behind calling all-ins, which hands can face a shove.

Follow these steps weekly to build a solid foundation.

### Intermediate / Professional Path [Vol.1]

Once fundamentals are solid, split study between:
1. **Pre-flop mastery** (ranges, adjustments, ICM)
2. **Post-flop depth** (c-bet strategy, turn/river play, exploits)

Prioritize by **frequency**: study the spots you encounter most often first.

---

## 3. Weekly Study Planner (Professional Template) [Vol.1]

| Day | Schedule |
|---|---|
| **Monday** | 10-12h Session Review → 13:30 Warm-up Drills → 14-22h GRIND |
| **Tuesday** | 10-12h Technical Lesson → 14-17h Study Group |
| **Wednesday** | 10-12h Drills + Session Review → 14-22h GRIND |
| **Thursday** | 10-12h Solver Work (HRC) → 13:30 Warm-up Drills → 14-22h GRIND |
| **Friday** | 10-12h Review weekly lesson + Session Review → Afternoon OFF |
| **Saturday** | Day OFF |
| **Sunday** | Morning: external activity → 13:30 Warm-up Drills → 14-22h GRIND |

### Ratio
- ~3 grind days, ~2 study days, ~1 mixed, ~1 off
- Always warm up with drills before grinding
- Session review ideally done the morning after

---

## 4. Leak Finder Framework [Vol.1]

### What You Need
- Large hand database (1000+ hands minimum, ideally 10,000+)
- Tracking software (Hand2Note, PokerTracker, HoldemManager)
- Methodology for comparing your stats to GTO baselines

### Process
1. Export your key statistics by position and situation
2. Compare each stat against known GTO ranges (see doc 08, MDA section)
3. Identify deviations: where are you too loose? Too tight? Too passive?
4. Create a study plan targeting the biggest leaks first

### Critical Stats to Monitor

| Stat | Target Range | Leak If |
|---|---|---|
| VPIP | Position-dependent | Way above/below RFI tables |
| PFR | Close to VPIP | Large VPIP-PFR gap = too passive |
| 3-bet % | 7-10% overall | < 5% = not aggressive enough |
| C-bet flop | ~50-60% IP | < 30% = missing value; > 80% = over-bluffing |
| Fold to C-bet | ~35-45% | < 25% = calling too wide; > 55% = folding too much |
| WTSD | ~25-30% | > 35% = calling too much; < 20% = folding too much |
| W$SD | > 50% | < 48% = calling too light at showdown |
| Limp % | < 5% (ideally 0%) | > 10% = major leak |
| SB VPIP | ~35-48% | > 50% = too loose from SB |

### Documenting Leaks [Vol.1]

Create a "leak document" with three columns:
1. **Screenshot of the hand**
2. **Your doubt / question**
3. **Solver answer / correct play**

This builds a personal reference library over time.

---

## 5. Session Review Best Practices

### When
- Morning after the session (fresh mind, emotional distance)
- Never during or immediately after grinding

### What to Review
1. **Big pots lost**: were you unlucky or did you make an error?
2. **Hands you were unsure about**: check against solver
3. **Tilt hands**: identify emotional decisions
4. **River decisions**: where you folded winners or called losers

### Tools
- Use Hand2Note replayer or PokerTracker hand replayer
- Cross-reference with GTO Wizard or PioSolver for specific spots
- Save interesting hands for study group discussion

---

## 6. Warm-Up Drills

### Purpose
- Get into "poker mode" before grinding
- Reinforce correct decisions from recent study
- Build pattern recognition for common spots

### Recommended Drill Software
- **GTO Wizard**: pre-flop and post-flop drills with scoring
- **Lucid GTO Trainer**: drill-focused platform
- **PokerSnowie**: play against AI with feedback

### Drill Duration
- 15-30 minutes before each grind session
- Focus on your weakest areas (identified by Leak Finder)

---

## 7. Software Setup Checklist

### Essential (Free/Low Cost)
- [ ] Equilab — equity calculations
- [ ] GTO Wizard (free tier) — basic solver access
- [ ] Hand2Note (free tier) — basic HUD

### Recommended (Paid)
- [ ] HRC or ICMIZER — ICM and pre-flop ranges
- [ ] GTO Wizard (premium) — full solver access, drills, MDA comparison
- [ ] Hand2Note (premium) — advanced HUD, MDA, population analysis

### Advanced
- [ ] PioSolver — custom post-flop solutions
- [ ] Monker Solver — advanced pre-flop solver
- [ ] PokerTracker 4 or HoldemManager 3 — comprehensive database

---

## 8. Variance and Bankroll Management [Vol.1]

### Understanding Variance
- 66% of poker hands don't go to showdown — skill dominates
- Of the remaining 34%, 68% are decided by player action, not luck
- Only ~13% of outcomes are truly determined by luck
- But short-term variance can be brutal — losing stretches are normal

### Bankroll Guidelines (MTTs)
- **Recreational**: 50-100 buy-ins of your average tournament
- **Semi-pro**: 100-200 buy-ins
- **Professional**: 200-500+ buy-ins
- MTTs have the highest variance of any format → need largest bankroll

### Resource
Use **Prime Dope** (primedope.com) to simulate variance and understand what to expect for your sample size.
