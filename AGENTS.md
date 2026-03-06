# AGENTS.md (PulsePress)

## Product Direction
- Product name: PulsePress
- Core concept: one screen, one button, one global count.
- Visual direction: premium brutalist signal aesthetic (paper + black + signal red), minimal copy, strong central interaction.

## UX Priorities
- Keep the app single-screen with no page scroll.
- Keep exactly one primary interactive control in the core flow.
- Preserve light and dark theme support with high contrast.
- Maintain keyboard accessibility, visible focus states, and reduced-motion behavior.

## Technical Guardrails
- Frontend: Vite + React + TypeScript.
- Backend: Convex with sharded write pattern for scalable increments.
- Package manager: bun only.
- Do not hardcode secrets; use environment variables.

## Delivery Checklist
- Run `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` before signoff.
- Keep documentation in sync (`README.md`, `CHANGELOG.md`, `prds/`).
