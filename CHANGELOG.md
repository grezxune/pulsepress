# Changelog

## 2026-03-05
- Initialized PulseForge project scaffold with Vite + React + TypeScript + bun.
- Added Convex integration and sharded global counter backend.
- Implemented single-screen, no-scroll branded UX with one primary button.
- Added matching logo and favicon assets.
- Added unit and integration tests with Vitest + Testing Library.
- Added project governance docs: local AGENTS.md, UxStyle.md, and PRD.
- Added server-enforced bot protection with Turnstile verification, captcha replay prevention, and rate limiting.

## 2026-03-06
- Removed Turnstile/captcha integration from frontend and backend.
- Kept server-side anti-abuse controls via per-client rate limiting in Convex.
