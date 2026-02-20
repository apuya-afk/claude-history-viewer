# AGENTS.md - Claude History Viewer

Local-only web app for browsing Claude Code conversation history from `~/.claude/projects/`.
Zero runtime dependencies, privacy-first, read-only by default.

## Build & Development Commands

```bash
npm run dev          # Vite (port 5173) + Python API (port 8547) concurrently
npm run build        # tsc && vite build — production build to dist/
npm run typecheck    # TypeScript type checking only (run before committing)
npm run dev:vite     # Vite dev server only
npm run dev:api      # Python API server only (python3 server.py)
npm run preview      # Preview production build
```

No test framework is configured. Validation is `npm run typecheck` (strict mode with
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). No linter or
formatter config exists — TypeScript strict mode is the enforced standard.

## Project Structure

```
src/
  index.html              # Entry point (semantic HTML, accessibility attrs)
  styles/
    main.css              # CSS variables, reset, layout, keyframes
    components.css        # Buttons, modals, messages, toolbar, code blocks
    responsive.css        # Mobile breakpoints, sidebar drawer
    enhancements.css      # Theme variants, toasts, skeleton loaders
  ts/
    main.ts               # Bootstrap, event listeners
    state.ts              # Central AppState object + mutation functions
    types.ts              # All TypeScript interfaces
    api.ts                # fetch-based server communication
    parser.ts             # JSONL file parsing
    render.ts             # DOM rendering via innerHTML
    export.ts             # Markdown/JSON export
    utils.ts              # HTML escaping, secret redaction (40+ patterns)
    theme.ts              # Light/dark/system theme management
    keyboard.ts           # Keyboard shortcuts
    toast.ts              # Toast notifications
    highlight.ts          # Regex-based syntax highlighting (no deps)
    icons.ts              # Lucide SVG icons as strings
server.py                 # Python HTTP server + REST API (port 8547)
vite.config.ts            # Vite config (root: src/, proxy /api to Python)
```

## TypeScript Conventions

**Imports**: Named imports only, relative paths with `./`. Use `import type` for types:
```typescript
import type { Message, Session } from './types';
import { state, setCurrentSession } from './state';
```

**Naming**:
- Functions/variables: `camelCase` — `loadSession`, `escapeHtml`
- Interfaces/types: `PascalCase` — `AppState`, `DOMElements`, `TokenUsage`
- Constants: `UPPER_SNAKE_CASE` — `STORAGE_KEY`, `SENSITIVE_PATTERNS`
- Booleans: prefix with `is`, `has`, `get`, `toggle`

**Types**: Explicit return types on all functions. Use `[]` for arrays, `??` for defaults,
`?.` for optional chaining. Union types for variants (`'light' | 'dark' | 'system'`).
```typescript
export async function loadSession(path: string): Promise<Message[] | null>
export function escapeHtml(text: string): string
```

**Error handling**: Try-catch with type guards. Never access `.message` without checking:
```typescript
try {
  const data = await backupAll();
  if (data.error) { toastError('Backup error: ' + data.error); }
} catch (e) {
  toastError('Failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
}
```

**Exports**: Named exports only, `export type` for type-only exports.

**Comments**: JSDoc block for file headers and function descriptions. `//` for inline.
```typescript
/** Load sessions from the server */
async function loadFromServer(): Promise<boolean> { }
```

**Modules**: Single responsibility per file. State mutations go through `state.ts` functions
(never mutate `state` directly). DOM updates go through `render.ts`. All types in `types.ts`.

## CSS Conventions

**Variables**: All colors, spacing, typography, and animation via CSS custom properties in
`main.css`. Key values: `--accent: #D4943A` (amber), `--bg-primary: #0C0B0E`.

**Naming**: Kebab-case classes (`.btn-primary`, `.session-list`). Modifiers via compound
selectors (`.btn.active`). States via pseudo-classes (`:hover`, `:focus-visible`).

**Typography**: Three-tier system — Newsreader (display/serif), Outfit (body/sans),
JetBrains Mono (code/mono). Use the CSS variables `--font-display`, `--font-body`, `--font-mono`.

**Theme**: "Amber Archive" — warm amber accents on deep dark backgrounds. Intentionally
distinctive, not generic. Both light and dark variants exist. Always test both themes.
Avoid generic AI aesthetics — no Inter/Roboto, no purple-on-white, no cookie-cutter layouts.

**Animations**: CSS-only. Use existing keyframes (`fadeIn`, `slideIn`, `scaleIn`, `spin`).
Transitions via `--transition-fast` / `--transition-normal` / `--transition-slow`.

## Python Server Conventions (server.py)

**Style**: PEP 8, full type annotations (`def list_sessions(self) -> dict[str, Any]`).
`snake_case` for functions/variables, `UPPER_SNAKE_CASE` for constants.

**Error handling**: Try-except with JSON error responses (`{"error": "message"}`). Skip
invalid JSONL lines silently. Validate all paths to prevent directory traversal.

**API endpoints** (all under `/api/`):
- `GET /api/sessions` — list all sessions
- `GET /api/session?path=` — get session messages
- `DELETE /api/session?path=` — delete session
- `GET /api/backup-all` — create zip backup
- `GET /api/backup-status` — list backups
- `GET /api/load-backup?name=` — load from backup
- `GET /api/restore-session?backup=&session=` — restore single session

## Key Patterns

**State**: Central `state` object in `state.ts` with mutation functions (`setSessions`,
`setCurrentSession`, `toggleThinking`, `toggleTools`, `toggleRedact`). No Redux/reducers.

**API calls**: Async fetch in `api.ts`, return `null` on error for graceful degradation.
All responses have optional `error` field.

**Rendering**: HTML string generation via template literals, applied with `innerHTML`.
All user input escaped via `escapeHtml()` before rendering.

**Security**: Path validation against directory traversal. Input sanitization. 40+ regex
patterns in `utils.ts` for redacting API keys, tokens, passwords, private keys, etc.

## Adding Features Checklist

1. Define interfaces in `types.ts`
2. Add state if needed in `state.ts` (with mutation function)
3. Implement logic in the appropriate module
4. Update `render.ts` for UI changes
5. Wire event listeners in `main.ts`
6. Add/update CSS in the appropriate stylesheet (use CSS variables)
7. For new API endpoints: implement in `server.py`, add fetch wrapper in `api.ts`
8. Run `npm run typecheck` before committing

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`.
