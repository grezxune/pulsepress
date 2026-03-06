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
- Removed remaining bot-rate-limit schema and code paths (`botClients`) and reverted to direct global increment flow.
- Replaced app logo and favicon with optimized PNG assets from the new PulseForge mark.
- Added `apple-touch-icon.png` and removed legacy SVG icon files.
- Converted the new PulseForge mark to true transparency and removed the visible white tile effect.
- Added a premium emblem treatment behind the logo for contrast on both light and dark themes.
- Updated the PulseForge title typography to match the primary page font.
- Reprocessed the provided logo file to remove baked checkerboard/white rectangle artifacts and regenerated all web icon assets.
