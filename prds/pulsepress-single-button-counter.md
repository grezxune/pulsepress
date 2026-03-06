---
title: PulsePress Single Button Counter
created: 2026-03-05
owner: Tommy
log:
  - 2026-03-05: Initial requirements documented for single-page Convex experiment.
  - 2026-03-05: Chosen stack switched from Next.js to Vite + React for minimal overhead.
  - 2026-03-05: Implemented sharded Convex counter model and one-screen branded UI.
  - 2026-03-05: Added bot protection with Turnstile verification, token replay prevention, and server-side rate limiting.
  - 2026-03-06: Removed Turnstile/captcha integration and removed remaining bot-rate-limit table usage.
  - 2026-03-06: Added comprehensive SEO/distribution metadata (Open Graph, Twitter cards, canonical tags, JSON-LD, sitemap, robots, and web manifest).
  - 2026-03-06: Added button speech-bubble behavior with large taunt/response phrase pools and idle-aware timing.
  - 2026-03-06: Added local level progression with escalating click-difficulty mechanics and level taunt titles.
  - 2026-03-06: Added persistent highest-level record tracking in Convex and surfaced record stats in UI.
  - 2026-03-06: Added round-based 10-second timer, one-click-per-level progression, and winner-name capture when a world record is beaten.
  - 2026-03-06: Hardened non-reduced-motion animation reliability for logo spin and rolling count transitions.
  - 2026-03-06: Fixed animation visibility and clipping regressions by using GSAP logo rotation in-app and percent-based reel transforms with larger counter slots.
  - 2026-03-06: Prevented remaining counter numeral clipping by increasing slot width and limiting reel overflow masking to the vertical axis.
  - 2026-03-06: Rebuilt top-of-tile stats into a cohesive game HUD header for clock, round, run metrics, world record, and latest winner visibility.
  - 2026-03-06: Removed the lower "Recent World Winners" tile and kept winner visibility in the HUD-only latest winner slot.
---

## Problem
Create an intentionally tiny public app that only does one thing: count global button presses in realtime.

## Business Context
This experiment validates high-scale write behavior, UX polish under constrained scope, and deployment ergonomics for future products.

## Goals & KPIs
- Reach first interaction in under 2 seconds on standard broadband.
- Keep p95 press-to-visibility update under 500 ms in normal operation.
- Keep app single-screen with zero vertical/horizontal scroll.

## Personas/Journeys
- Casual visitor: lands, sees count, presses once.
- Returning user: confirms global counter is still live and responsive.

## Functional Requirements
- Render one page with one primary button and compact supporting text.
- Persist count in Convex.
- Reflect count updates in realtime.
- Show loading and error feedback.
- Provide matching logo + favicon.
- Publish complete SEO/share metadata for social cards and crawler indexing.
- Display a button speech bubble that taunts periodically and reacts to presses.
  - Message timing: 6 seconds visible with a 2-second silent interval between messages.
  - Layout stability: reserve static bubble height to avoid component movement during message gaps.
  - Content quality: taunt/response pools must have unique lines and unique punchline endings.
  - Copy constraint: every taunt/response line must be 15 words or fewer.
- Add local per-client level progression that increases UI click difficulty as local presses increase.
  - Include level labels in the format `Level N - {taunt title}`.
  - Difficulty mechanics may include sliding, teleporting, camouflage contrast reduction, and tighter click windows.
- Store and display the highest level record achieved using a dedicated Convex table.
- Treat each button press as exactly one level advancement.
- Start a 10-second round timer after the first successful press of a run.
- Reset the run to round 1 when the timer expires without a press.
- If the run beats the global highest level, show a branded winner modal after timeout so the player can submit a display name.
- Persist winner history records (name + achieved level + timestamp) and display the latest winner in the HUD.
- Present round and record telemetry in a dedicated game-style HUD header at the top of the tile.

## Non-functional Requirements
- Mobile and desktop responsive.
- Light/dark mode support.
- WCAG 2.1 AA-aware contrast and keyboard support.

## Data & Integrations
- Convex table `counterShards` with write sharding for increment throughput.
- Convex query `getTotal` aggregates shard counts.
- Convex mutation `increment` updates sharded counts.
- Convex tables `levelRecords`, `winnerClaims`, and `levelWinners` track world records and gated winner-name submissions.

## Security Architecture & Threat Model
- Trust boundary: public client to Convex public mutation.
- Abuse case: scripted rapid-fire presses.
  Mitigation path: add edge or API-layer throttling if abuse appears in production.
- Input validation: mutation clamps `shardHint` to valid numeric range.
- Input validation: winner names are trimmed, length-bounded, and rejected when empty.
- Secrets: deployment URLs and keys remain in environment variables.

## Performance Strategy & Budgets
- Write sharding budget: 128 shards to reduce single-row write contention.
- UI budget: keep JS bundle minimal and avoid heavy component frameworks.
- Render budget: single view, minimal re-render tree, no list virtualization needed.
- Timer budget: countdown updates should remain lightweight (small interval update on one text node).

## Open Questions
- Should counter resets/epochs be supported later?

## Risks & Mitigations
- Risk: cloud Convex project quota blocks new cloud project creation.
- Mitigation: use local anonymous deployment for development; promote to cloud when quota is available.

## Success Metrics
- Counter increments reliably with no data loss in functional testing.
- Lint, typecheck, tests, and production build all pass.

## Rollout Plan
1. Local development with anonymous Convex deployment.
2. Create dedicated cloud Convex project.
3. Deploy frontend to Vercel with Convex URL environment variable.

## Next Steps
- Add network-level throttling if abuse is observed.
- Consider anti-spam controls for repeated winner-name submissions from the same client/session.
