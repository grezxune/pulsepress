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
- Removed white highlights from the circular logo badge gradient for a darker premium finish.
- Added comprehensive SEO/share metadata (canonical, robots, Open Graph, Twitter cards, and JSON-LD).
- Added `robots.txt`, `sitemap.xml`, and `site.webmanifest` for indexing/distribution.
- Added a dedicated social preview image (`og-image.png`) and stamped it with the live global count.
- Added an interactive chat bubble voice system for the button with rotating taunts and post-click reactions.
- Added 300 taunt lines and 300 click-response lines via phrase pools with non-repeating shuffled playback.
- Added timing behavior: taunts rotate every few seconds, pause immediately after click, and resume after 5 seconds of idle time.
- Updated bubble timing to a unified 6-second display window for taunts and click responses.
- Added a 2-second silent gap between bubble messages and reserved fixed bubble space to prevent layout shift.
- Rebuilt taunt/response phrase pools to remove repeated punchline endings and enforce uniqueness.
- Enforced a hard 15-word maximum for every taunt and every click response.
- Added local per-client level progression with taunting level titles and escalating button difficulty.
- Added progressive mechanics by level: horizontal slide, random teleporting, camouflage styling, and shrinking click windows.
- Added continuous logo rotation (360 degrees every 3 seconds, infinite loop).
