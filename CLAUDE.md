# Claude Code History Viewer

## Project Overview

A local web app to browse, search, backup, and manage Claude Code conversation history from `~/.claude/projects/`.

## Tech Stack

- **Frontend:** TypeScript (strict mode), Vite, vanilla CSS with custom properties
- **Backend:** Python HTTP server (`server.py`) with file API
- **Build:** `npm run build` (tsc + vite build)
- **Dev:** `npm run dev` (Vite dev server + Python API via concurrently)
- **Zero runtime dependencies** - all frontend is vanilla HTML/CSS/JS compiled from TypeScript

## Architecture

- `src/ts/` - TypeScript modules (entry: `main.ts`)
- `src/styles/` - CSS split into main, components, responsive, enhancements
- `src/index.html` - HTML entry point
- `server.py` - Python HTTP server + REST API (`/api/sessions`, `/api/session/{path}`)
- `dist/` - Production build output

## Key Conventions

- CSS custom properties for theming (light/dark/system)
- All state managed in `src/ts/state.ts` via a central `AppState` object
- DOM rendering in `src/ts/render.ts`
- TypeScript interfaces in `src/ts/types.ts`
- No external CSS frameworks - all custom CSS
- Read-only operation on Claude history files
- Privacy-first: no external requests, no analytics

## Commands

- `npm run dev` - Start dev server (port 5173 with API proxy)
- `npm run build` - Production build
- `npm run typecheck` - Type checking only
- `python3 server.py` - Production server (port 8547)

## Frontend Aesthetics

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
