/**
 * Sample PokerStars hand history text for testing.
 * Based on the format documented in CLAUDE.md.
 */

/** Standard 9-max hand with all streets. Hero is scorza23 at seat 4 (UTG). */
export const HAND_FULL_STREETS = `\
PokerStars Hand #260356646368: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level III (25/50) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]
Table '3989541132 1' 9-max Seat #1 is the button
Seat 1: player1 (1480 in chips)
Seat 2: player2 (1520 in chips)
Seat 3: player3 (1450 in chips)
Seat 4: scorza23 (1600 in chips)
Seat 5: player5 (1400 in chips)
Seat 6: player6 (1550 in chips)
Seat 7: player7 (1500 in chips)
Seat 8: player8 (1300 in chips)
Seat 9: player9 (1200 in chips)
player1: posts the ante 5
player2: posts the ante 5
player3: posts the ante 5
scorza23: posts the ante 5
player5: posts the ante 5
player6: posts the ante 5
player7: posts the ante 5
player8: posts the ante 5
player9: posts the ante 5
player2: posts small blind 25
player3: posts big blind 50
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 50 to 100
player5: folds
player6: folds
player7: folds
player8: folds
player9: folds
player1: folds
player2: folds
player3: calls 50
*** FLOP *** [Td 7h 2s]
player3: checks
scorza23: bets 66
player3: calls 66
*** TURN *** [Td 7h 2s] [Ks]
player3: checks
scorza23: bets 150
player3: folds
*** SUMMARY ***
Total pot 477 | Rake 0
Board [Td 7h 2s Ks]
Seat 1: player1 (button) folded before Flop (didn't bet)
Seat 2: player2 (small blind) folded before Flop
Seat 3: player3 (big blind) folded on the Turn
Seat 4: scorza23 collected (477)
Seat 5: player5 folded before Flop (didn't bet)
Seat 6: player6 folded before Flop (didn't bet)
Seat 7: player7 folded before Flop (didn't bet)
Seat 8: player8 folded before Flop (didn't bet)
Seat 9: player9 folded before Flop (didn't bet)`;

/** Hand ending preflop — everyone folds to hero's raise. Hero at CO (seat 9). */
export const HAND_PREFLOP_ONLY = `\
PokerStars Hand #260356646400: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level II (15/30) - 2026/04/05 18:20:00 UTC [2026/04/05 14:20:00 ET]
Table '3989541132 1' 9-max Seat #1 is the button
Seat 1: player1 (1480 in chips)
Seat 2: player2 (1520 in chips)
Seat 3: player3 (1450 in chips)
Seat 4: scorza23 (1600 in chips)
Seat 5: player5 (1400 in chips)
Seat 6: player6 (1550 in chips)
Seat 7: player7 (1500 in chips)
Seat 8: player8 (1300 in chips)
Seat 9: player9 (1200 in chips)
player2: posts small blind 15
player3: posts big blind 30
*** HOLE CARDS ***
Dealt to scorza23 [Qd Jd]
scorza23: raises 30 to 60
player5: folds
player6: folds
player7: folds
player8: folds
player9: folds
player1: folds
player2: folds
player3: folds
*** SUMMARY ***
Total pot 105 | Rake 0
Seat 1: player1 (button) folded before Flop (didn't bet)
Seat 2: player2 (small blind) folded before Flop
Seat 3: player3 (big blind) folded before Flop
Seat 4: scorza23 collected (105)`;

/** Heads-up hand. Hero is BTN/SB (seat 3). */
export const HAND_HEADS_UP = `\
PokerStars Hand #260356646500: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level VIII (100/200) - 2026/04/05 19:30:00 UTC [2026/04/05 15:30:00 ET]
Table '3989541132 1' 9-max Seat #3 is the button
Seat 3: scorza23 (5400 in chips)
Seat 7: villain1 (8100 in chips)
scorza23: posts the ante 25
villain1: posts the ante 25
scorza23: posts small blind 100
villain1: posts big blind 200
*** HOLE CARDS ***
Dealt to scorza23 [9c 8c]
scorza23: raises 200 to 400
villain1: calls 200
*** FLOP *** [7d 6h 2c]
villain1: checks
scorza23: bets 200
villain1: calls 200
*** TURN *** [7d 6h 2c] [5s]
villain1: checks
scorza23: bets 800
villain1: folds
*** SUMMARY ***
Total pot 1250 | Rake 0
Board [7d 6h 2c 5s]
Seat 3: scorza23 (button) (small blind) collected (1250)
Seat 7: villain1 (big blind) folded on the Turn`;

/** BB facing a normal 2x open raise. Hero is BB (seat 2). BTN at seat 6 so seat 2 = BB. */
export const HAND_BB_VS_RAISE = `\
PokerStars Hand #260356646600: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level IV (50/100) - 2026/04/05 18:45:00 UTC [2026/04/05 14:45:00 ET]
Table '3989541132 1' 6-max Seat #6 is the button
Seat 1: player1 (3000 in chips)
Seat 2: scorza23 (2800 in chips)
Seat 3: player3 (3200 in chips)
Seat 4: player4 (2500 in chips)
Seat 5: player5 (2900 in chips)
Seat 6: player6 (2600 in chips)
player1: posts small blind 50
scorza23: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [7s 6s]
player3: folds
player4: folds
player5: raises 100 to 200
player6: folds
player1: folds
scorza23: calls 100
*** FLOP *** [8d 5h 2c]
scorza23: checks
player5: bets 130
scorza23: calls 130
*** TURN *** [8d 5h 2c] [4s]
scorza23: bets 300
player5: folds
*** SUMMARY ***
Total pot 810 | Rake 0
Board [8d 5h 2c 4s]
Seat 2: scorza23 (big blind) collected (810)
Seat 5: player5 folded on the Turn`;

/**
 * Hero (seat 3, CO) faces an all-in shove from UTG (seat 1).
 * BTN=4, 6-max: BTN(4), SB(5), BB(6), UTG(1), HJ(2), CO(3=hero).
 * Player6 is BB and calls the all-in.
 */
export const HAND_BB_VS_ALLIN = `\
PokerStars Hand #260356646700: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level X (150/300) - 2026/04/05 20:00:00 UTC [2026/04/05 16:00:00 ET]
Table '3989541132 1' 6-max Seat #4 is the button
Seat 1: player1 (1800 in chips)
Seat 2: player2 (4500 in chips)
Seat 3: scorza23 (3200 in chips)
Seat 4: player4 (3000 in chips)
Seat 5: player5 (2500 in chips)
Seat 6: player6 (3000 in chips)
player1: posts the ante 30
player2: posts the ante 30
scorza23: posts the ante 30
player4: posts the ante 30
player5: posts the ante 30
player6: posts the ante 30
player5: posts small blind 150
player6: posts big blind 300
*** HOLE CARDS ***
Dealt to scorza23 [As Qh]
player1: raises 1470 to 1770 and is all-in
player2: folds
scorza23: folds
player4: folds
player5: folds
player6: calls 1470
*** FLOP *** [Kd Th 4c]
*** TURN *** [Kd Th 4c] [Jh]
*** RIVER *** [Kd Th 4c Jh] [2d]
*** SHOW DOWN ***
player1: shows [9s 9c] (a pair of Nines)
player6: shows [Kc 8h] (a pair of Kings)
player6 collected 3870 from pot
*** SUMMARY ***
Total pot 3870 | Rake 0
Board [Kd Th 4c Jh 2d]
Seat 1: player1 showed [9s 9c] and lost
Seat 3: scorza23 folded before Flop (didn't bet)
Seat 6: player6 (big blind) showed [Kc 8h] and won (3870)`;

/** Blind war — folded to SB. Hero is SB (seat 6). 6-max table. */
export const HAND_BLIND_WAR = `\
PokerStars Hand #260356646800: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level V (75/150) - 2026/04/05 19:00:00 UTC [2026/04/05 15:00:00 ET]
Table '3989541132 1' 6-max Seat #4 is the button
Seat 1: player1 (3000 in chips)
Seat 2: player2 (2800 in chips)
Seat 3: player3 (3200 in chips)
Seat 4: player4 (2500 in chips)
Seat 5: scorza23 (2900 in chips)
Seat 6: player6 (2600 in chips)
scorza23: posts small blind 75
player6: posts big blind 150
*** HOLE CARDS ***
Dealt to scorza23 [Kc Td]
player1: folds
player2: folds
player3: folds
player4: folds
scorza23: raises 150 to 300
player6: folds
*** SUMMARY ***
Total pot 450 | Rake 0
Seat 4: player4 (button) folded before Flop (didn't bet)
Seat 5: scorza23 (small blind) collected (450)
Seat 6: player6 (big blind) folded before Flop`;

/** Walk — everyone folds to BB. Hero is BB (seat 6). BTN=4 so BB=6. */
export const HAND_WALK = `\
PokerStars Hand #260356646900: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level V (75/150) - 2026/04/05 19:05:00 UTC [2026/04/05 15:05:00 ET]
Table '3989541132 1' 6-max Seat #4 is the button
Seat 1: player1 (3000 in chips)
Seat 2: player2 (2800 in chips)
Seat 3: player3 (3200 in chips)
Seat 4: player4 (2500 in chips)
Seat 5: player5 (2900 in chips)
Seat 6: scorza23 (2600 in chips)
player5: posts small blind 75
scorza23: posts big blind 150
*** HOLE CARDS ***
Dealt to scorza23 [3d 2c]
player1: folds
player2: folds
player3: folds
player4: folds
player5: folds
*** SUMMARY ***
Total pot 225 | Rake 0
Seat 5: player5 (small blind) folded before Flop
Seat 6: scorza23 (big blind) collected (225)`;

/** Non-contiguous seats (1, 3, 6, 8) with BTN at seat 6. Hero at seat 1 (BB). */
export const HAND_NON_CONTIGUOUS = `\
PokerStars Hand #260356647000: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level IV (50/100) - 2026/04/05 18:50:00 UTC [2026/04/05 14:50:00 ET]
Table '3989541132 1' 9-max Seat #6 is the button
Seat 1: scorza23 (2000 in chips)
Seat 3: player3 (2500 in chips)
Seat 6: player6 (3000 in chips)
Seat 8: player8 (2200 in chips)
player8: posts small blind 50
scorza23: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ac 5c]
player3: raises 100 to 200
player6: folds
player8: folds
scorza23: calls 100
*** FLOP *** [Kc 8c 3h]
scorza23: checks
player3: bets 200
scorza23: calls 200
*** TURN *** [Kc 8c 3h] [7c]
scorza23: bets 400
player3: folds
*** SUMMARY ***
Total pot 850 | Rake 0
Board [Kc 8c 3h 7c]
Seat 1: scorza23 (big blind) collected (850)
Seat 3: player3 folded on the Turn`;

/** Facing a limp — someone limps before hero. Hero at CO. */
export const HAND_FACING_LIMP = `\
PokerStars Hand #260356647100: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level III (25/50) - 2026/04/05 18:55:00 UTC [2026/04/05 14:55:00 ET]
Table '3989541132 1' 6-max Seat #1 is the button
Seat 1: player1 (1500 in chips)
Seat 2: player2 (1400 in chips)
Seat 3: player3 (1600 in chips)
Seat 4: scorza23 (1500 in chips)
Seat 5: player5 (1300 in chips)
Seat 6: player6 (1700 in chips)
player2: posts small blind 25
player3: posts big blind 50
*** HOLE CARDS ***
Dealt to scorza23 [Kd Qs]
player6: calls 50
player1: folds
scorza23: raises 100 to 150
player2: folds
player3: folds
player6: folds
*** SUMMARY ***
Total pot 275 | Rake 0
Seat 4: scorza23 collected (275)`;

/** File with BOM encoding prefix. */
export const HAND_WITH_BOM = `\uFEFF\
PokerStars Hand #260356647200: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:00:00 UTC [2026/04/05 14:00:00 ET]
Table '3989541132 1' 9-max Seat #1 is the button
Seat 1: player1 (1500 in chips)
Seat 2: player2 (1500 in chips)
Seat 3: scorza23 (1500 in chips)
player2: posts small blind 10
scorza23: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [As Ks]
player1: folds
player2: folds
*** SUMMARY ***
Total pot 30 | Rake 0
Seat 2: player2 (small blind) folded before Flop
Seat 3: scorza23 (big blind) collected (30)`;

/** Multi-hand file — two hands separated by blank lines. */
export const MULTI_HAND_FILE = `\
PokerStars Hand #111111111111: Tournament #9999999999, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:00:00 UTC [2026/04/05 14:00:00 ET]
Table '9999999999 1' 6-max Seat #1 is the button
Seat 1: player1 (1500 in chips)
Seat 2: player2 (1500 in chips)
Seat 3: scorza23 (1500 in chips)
Seat 4: player4 (1500 in chips)
Seat 5: player5 (1500 in chips)
Seat 6: player6 (1500 in chips)
player2: posts small blind 10
player3: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Td 9d]
player4: folds
player5: folds
player6: folds
player1: folds
player2: folds
*** SUMMARY ***
Total pot 30 | Rake 0
Seat 3: scorza23 (big blind) collected (30)


PokerStars Hand #222222222222: Tournament #9999999999, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:01:00 UTC [2026/04/05 14:01:00 ET]
Table '9999999999 1' 6-max Seat #2 is the button
Seat 1: player1 (1490 in chips)
Seat 2: player2 (1510 in chips)
Seat 3: scorza23 (1530 in chips)
Seat 4: player4 (1480 in chips)
Seat 5: player5 (1490 in chips)
Seat 6: player6 (1500 in chips)
player3: posts small blind 10
scorza23: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Jh Tc]
player4: folds
player5: folds
player6: folds
player1: folds
player2: raises 20 to 40
player3: folds
scorza23: calls 20
*** FLOP *** [Qh 9d 3s]
scorza23: checks
player2: bets 40
scorza23: raises 80 to 120
player2: folds
*** SUMMARY ***
Total pot 200 | Rake 0
Board [Qh 9d 3s]
Seat 3: scorza23 (big blind) collected (200)`;

/** Duplicate hand ID (same as first hand in MULTI_HAND_FILE) for dedup testing. */
export const DUPLICATE_HAND = `\
PokerStars Hand #111111111111: Tournament #9999999999, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:00:00 UTC [2026/04/05 14:00:00 ET]
Table '9999999999 1' 6-max Seat #1 is the button
Seat 1: player1 (1500 in chips)
Seat 2: player2 (1500 in chips)
Seat 3: scorza23 (1500 in chips)
Seat 4: player4 (1500 in chips)
Seat 5: player5 (1500 in chips)
Seat 6: player6 (1500 in chips)
player2: posts small blind 10
player3: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Td 9d]
player4: folds
player5: folds
player6: folds
player1: folds
player2: folds
*** SUMMARY ***
Total pot 30 | Rake 0
Seat 3: scorza23 (big blind) collected (30)`;

/**
 * W$SD regression: hero reaches showdown but wins without "showed and won".
 * Villain shows first on river and mucks when their hand is weaker; hero
 * collects pot. `hasShowdown=true`, hero collected > 0, but hero has NO
 * "showed [cards] and won" line in SUMMARY — W$SD must be false.
 */
export const HAND_WON_WITHOUT_SHOWING = `\
PokerStars Hand #260356647400: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level VI (100/200) - 2026/04/05 19:30:00 UTC [2026/04/05 15:30:00 ET]
Table '3989541132 1' 6-max Seat #1 is the button
Seat 1: scorza23 (4000 in chips)
Seat 2: player2 (3500 in chips)
Seat 3: player3 (3000 in chips)
Seat 4: player4 (2500 in chips)
Seat 5: player5 (2000 in chips)
Seat 6: player6 (3000 in chips)
scorza23: posts the ante 20
player2: posts the ante 20
player3: posts the ante 20
player4: posts the ante 20
player5: posts the ante 20
player6: posts the ante 20
player2: posts small blind 100
player3: posts big blind 200
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
player4: folds
player5: folds
player6: folds
scorza23: raises 200 to 400
player2: folds
player3: calls 200
*** FLOP *** [Ad 7d 3c]
player3: checks
scorza23: bets 300
player3: calls 300
*** TURN *** [Ad 7d 3c] [8s]
player3: checks
scorza23: bets 600
player3: calls 600
*** RIVER *** [Ad 7d 3c 8s] [2d]
player3: bets 800
scorza23: calls 800
*** SHOW DOWN ***
player3: shows [Kd Qd] (high card Ace)
scorza23: mucks hand
scorza23 collected 4320 from pot
*** SUMMARY ***
Total pot 4320 | Rake 0
Board [Ad 7d 3c 8s 2d]
Seat 1: scorza23 (button) mucked [Ah Kh]
Seat 3: player3 (big blind) showed [Kd Qd] and lost with high card Ace`;

/** Hand with showdown + all-in on river. */
export const HAND_SHOWDOWN = `\
PokerStars Hand #260356647300: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level VI (100/200) - 2026/04/05 19:15:00 UTC [2026/04/05 15:15:00 ET]
Table '3989541132 1' 6-max Seat #1 is the button
Seat 1: scorza23 (4000 in chips)
Seat 2: player2 (3500 in chips)
Seat 3: player3 (3000 in chips)
Seat 4: player4 (2500 in chips)
Seat 5: player5 (2000 in chips)
Seat 6: player6 (3000 in chips)
scorza23: posts the ante 20
player2: posts the ante 20
player3: posts the ante 20
player4: posts the ante 20
player5: posts the ante 20
player6: posts the ante 20
player2: posts small blind 100
player3: posts big blind 200
*** HOLE CARDS ***
Dealt to scorza23 [Qs Qd]
player4: folds
player5: folds
player6: folds
scorza23: raises 200 to 400
player2: folds
player3: calls 200
*** FLOP *** [Qh 7d 3c]
player3: checks
scorza23: bets 250
player3: calls 250
*** TURN *** [Qh 7d 3c] [8s]
player3: checks
scorza23: bets 600
player3: raises 1730 to 2330 and is all-in
scorza23: calls 1730
*** RIVER *** [Qh 7d 3c 8s] [2d]
*** SHOW DOWN ***
player3: shows [7s 7h] (a full house, Sevens full of Queens)
scorza23: shows [Qs Qd] (three of a kind, Queens)
player3 collected 6180 from pot
*** SUMMARY ***
Total pot 6180 | Rake 0
Board [Qh 7d 3c 8s 2d]
Seat 1: scorza23 (button) showed [Qs Qd] and lost with three of a kind, Queens
Seat 3: player3 (big blind) showed [7s 7h] and won (6180) with a full house, Sevens full of Queens`;
