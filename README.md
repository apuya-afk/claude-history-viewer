# Claude Code History Viewer

A local web app to browse, search, backup, and manage Claude Code conversation history from `~/.claude/projects/`.

## Features

- **Browse Sessions**: View all conversations with previews, timestamps, and message counts
- **Search**: Filter messages by keyword across conversations
- **Backup & Restore**: Create timestamped zip backups and restore individual sessions
- **Delete Conversations**: Remove sessions with confirmation prompt
- **Export**: Save conversations as Markdown or JSON
- **Secret Redaction**: Auto-detect and redact API keys, tokens, passwords
- **Syntax Highlighting**: Code blocks with language detection and copy buttons
- **Theme Toggle**: Light ("Warm Parchment"), dark ("Amber Archive"), and system-preference modes
- **Keyboard Shortcuts**: Navigate and control the app without a mouse
- **Mobile Responsive**: Slide-out drawer navigation on small screens

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (runs Vite + Python API)
npm run dev
```

Opens automatically at http://localhost:5173 with hot reload.

### Production Build

```bash
npm run build
python3 server.py
```

Opens at http://localhost:8547.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` | Next session |
| `k` | Previous session |
| `/` | Focus search |
| `t` | Toggle thinking blocks |
| `o` | Toggle tool calls |
| `r` | Toggle redaction |
| `e` | Export conversation |
| `Esc` | Close modal/sidebar |
| `?` | Show all shortcuts |

## Project Structure

```
claude-history-viewer/
├── src/
│   ├── index.html
│   ├── styles/
│   │   ├── main.css          # Base styles, CSS variables
│   │   ├── components.css    # Buttons, modals, messages
│   │   ├── responsive.css    # Media queries
│   │   └── enhancements.css  # Themes, toasts, animations
│   └── ts/
│       ├── main.ts           # Entry point, event listeners
│       ├── api.ts            # Server API calls
│       ├── render.ts         # DOM rendering
│       ├── state.ts          # App state management
│       ├── types.ts          # TypeScript interfaces
│       ├── parser.ts         # JSONL parsing
│       ├── export.ts         # Markdown/JSON export
│       ├── utils.ts          # HTML escape, redaction
│       ├── icons.ts          # SVG icons (Lucide)
│       ├── theme.ts          # Light/dark mode
│       ├── keyboard.ts       # Keyboard shortcuts
│       ├── toast.ts          # Notifications
│       └── highlight.ts      # Syntax highlighting
├── server.py                 # Python HTTP server + API
├── CLAUDE.md                 # Claude Code project context & aesthetics prompt
├── backups/                  # Backup zip files (gitignored)
├── dist/                     # Production build
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Backup System

**Create Backup**: Click "Backup" to create a timestamped zip of all sessions.

**Browse Backups**: Click "Backups" to see available backups and their contents.

**Restore**: Select individual sessions from a backup to restore to Claude history.

Backups are stored in `./backups/` and are not committed to git.

## Security

Auto-redacts sensitive data when enabled:
- API keys (OpenAI, Anthropic, AWS, GitHub)
- Tokens and secrets
- Private keys
- Database connection strings
- Email addresses
- Internal IP addresses

## Privacy

- **Local only**: All processing happens in your browser
- **No tracking**: No analytics or telemetry
- **Read-only**: Original files are never modified (backups are copies)
- **Minimal external requests**: Google Fonts loaded on initial page load; works offline after cached

## Development

```bash
npm run dev        # Vite dev server + Python API
npm run build      # Production build
npm run typecheck  # TypeScript type checking
```

### Tech Stack

- TypeScript (strict mode)
- Vite (dev server, bundler)
- Python (HTTP server, file API)
- CSS custom properties (theming)
- Google Fonts (Newsreader, Outfit, JetBrains Mono)

## License

MIT
