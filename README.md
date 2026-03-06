# PulsePress

PulsePress is a one-screen experiment: one button and one global realtime count.

## Stack
- Vite + React + TypeScript
- Convex (query/mutation + realtime sync)
- bun

## Development
```bash
bun install
CONVEX_AGENT_MODE=anonymous bunx convex dev
bun run dev
```

`convex dev` writes `.env.local` with `VITE_CONVEX_URL` for the frontend.
Use `.env.example` as the baseline for required env variables.

## Scripts
- `bun run dev` - start Vite dev server
- `bun run convex:dev` - run Convex dev server
- `bun run lint` - run ESLint
- `bun run typecheck` - run TypeScript checks
- `bun run test` - run unit + integration tests
- `bun run build` - build production bundle

## Architecture Notes
- Counter uses a sharded Convex table (`counterShards`) to support high concurrent write throughput.
- Frontend aggregates shard counts via `getTotal` and submits increments through `increment`.
- Gameplay uses round-based progression: one click equals one level with a 10-second timer per round.
- Global world-record tracking uses `levelRecords`; claim tokens from `winnerClaims` gate valid submissions into `levelWinners`.

## Deployment Notes
- Frontend target: Vercel.
- Required env var in frontend deployment: `VITE_CONVEX_URL`.
- For cloud Convex, run `bunx convex dev --configure existing ...` or create a new project when quota is available.
