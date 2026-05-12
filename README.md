# Poker Hand Analyzer

A client-side React + TypeScript app for analyzing PokerStars tournament hand
histories. Parses `.txt` exports, classifies preflop scenarios, scores hero
decisions against pre-defined theoretical ranges, tracks leaks across sessions,
and visualizes results in a dark poker-HUD UI. No backend, no external APIs —
everything runs in the browser and persists to IndexedDB. Default hero
is `scorza23`.

## Quick start

```bash
npm install
npm run dev      # start the Vite dev server
npm test -- --run # run the Vitest suite (~420 tests)
npm run build    # production build
```

## What lives where

```
/
├── README.md ............. you are here
├── CLAUDE.md ............. project memory for Claude Code (intent / spec)
├── AGENTS.md ............. multi-agent collaboration entrypoint
├── index.html ............ Vite entry
├── package.json .......... deps + npm scripts
├── vite.config.ts ........ build config
├── tsconfig.json ......... TypeScript config
├── tailwind.config.ts .... Tailwind 4 config (via plugin)
├── Dockerfile ............ deploy target (static nginx)
├── src/ .................. the React app
│   ├── parser/ ........... PokerStars hand-history parser
│   ├── analysis/ ......... scenario detection, range compliance, leaks
│   ├── data/ ............. ranges, Dexie/IndexedDB, Zustand store
│   ├── components/ ....... layout, hands, career, shared widgets
│   ├── pages/ ............ routed views (Dashboard, Hands, Stats, ...)
│   └── test/fixtures/ .... real PokerStars .txt fixtures
├── scripts/ .............. build/utility scripts (regen-status, install-hooks)
├── docs/ ................. all documentation (see docs/README.md)
│   ├── product/ .......... STATUS, ROADMAP, PARSER_HEALTH
│   ├── agents/ ........... AI-agent coordination contracts
│   ├── knowledge/ ........ poker theory the analysis logic derives from
│   ├── audits/ ........... IP / professionalism audits
│   ├── validation/ ....... user-interview track
│   ├── plans/ ............ dated implementation plans
│   ├── design/ ........... UI/UX briefs
│   ├── reports/ .......... janitor + KB-drift reports
│   └── research/ ......... competitor research
├── .claude/ .............. Claude Code agent config (settings, agent defs)
└── .agents/ .............. Hermes/Antigravity collab scaffolding
```

## Who reads what

| If you are... | Start here |
|---|---|
| A new human contributor | this README, then [`CLAUDE.md`](CLAUDE.md) |
| Claude Code (this agent) | [`CLAUDE.md`](CLAUDE.md), then [`.claude/agents/janitor.md`](.claude/agents/janitor.md) |
| Hermes / Antigravity / any coding agent | [`AGENTS.md`](AGENTS.md), then [`docs/agents/AGENT_HANDOFF.md`](docs/agents/AGENT_HANDOFF.md) |
| A poker player auditing the analysis logic | [`docs/knowledge/strategy/`](docs/knowledge/strategy/) |
| Someone curious what's actually shipped | [`docs/product/STATUS.md`](docs/product/STATUS.md) |
| Looking for the full doc map | [`docs/README.md`](docs/README.md) |

## Tech stack

React 19 · TypeScript (strict) · Vite 6 · Tailwind 4 · Zustand 5 · Dexie 4 ·
Recharts · Framer Motion · poker-odds-calculator · Vitest 3 ·
@tanstack/react-table + react-virtual · vite-plugin-pwa.

## License & IP

Strategy notes and theoretical ranges are derived from public-domain poker
theory plus the contributor's personal study materials. See
[`docs/audits/IP_COPY_AUDIT.md`](docs/audits/IP_COPY_AUDIT.md) for the
current neutralization status.
