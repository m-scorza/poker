# Poker Hand Analyzer

A private, local-first React + TypeScript app for analyzing poker tournament
hand histories. It imports PokerStars, GGPoker, and Open Hand History inputs,
classifies preflop/postflop spots, scores hero decisions against local
theoretical ranges, tracks leaks across sessions, and visualizes results in a
browser-only analytics UI. No backend, no external APIs by default: hand data
stays in local IndexedDB.

## Quick start

```bash
npm ci
npm run dev       # start the Vite dev server
npm test          # run the Vitest suite
npm run build     # typecheck + production build
npm run docs:check
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
├── Dockerfile ............ deploy target (static nginx)
├── src/ .................. the React app
│   ├── parser/ ........... PokerStars, GGPoker, and OHH import logic
│   ├── analysis/ ......... scenario detection, range compliance, leaks
│   ├── data/ ............. ranges, Dexie/IndexedDB, Zustand store
│   ├── components/ ....... layout, hands, career, shared widgets
│   ├── pages/ ............ routed views (Dashboard, Hands, Stats, ...)
│   └── test/fixtures/ .... PokerStars and GGPoker parser fixtures
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
| A new human contributor | this README, then [`docs/product/STATUS.md`](docs/product/STATUS.md) |
| Claude Code (this agent) | [`AGENTS.md`](AGENTS.md), then [`CLAUDE.md`](CLAUDE.md) |
| Hermes / Antigravity / any coding agent | [`AGENTS.md`](AGENTS.md), then [`docs/agents/AGENT_HANDOFF.md`](docs/agents/AGENT_HANDOFF.md) |
| A poker player auditing the analysis logic | [`docs/knowledge/strategy/`](docs/knowledge/strategy/) |
| Someone curious what's actually shipped | [`docs/product/STATUS.md`](docs/product/STATUS.md) |
| Looking for the full doc map | [`docs/README.md`](docs/README.md) |

## Tech stack

React 19 · TypeScript (strict) · Vite 6 · Tailwind 4 · Zustand 5 · Dexie 4 ·
Recharts · Framer Motion · poker-odds-calculator · Vitest 3 ·
@tanstack/react-table · @tanstack/react-virtual · vite-plugin-pwa.

## License & IP

Strategy notes and theoretical ranges are derived from public-domain poker
theory plus the contributor's personal study materials. See
[`docs/audits/IP_COPY_AUDIT.md`](docs/audits/IP_COPY_AUDIT.md) for the
current neutralization status.
