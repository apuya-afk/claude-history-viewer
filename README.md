# Claude Code History Viewer

A secure, local-only web app to view and export Claude Code conversation history from `~/.claude/projects/**/*.jsonl` files.

## Features

- **Local Processing**: All files are processed in your browser. No data is sent to any server.
- **Secret Redaction**: Automatically detects and redacts API keys, tokens, passwords, and other sensitive information.
- **Multiple Sessions**: Load and browse multiple conversation sessions.
- **Search**: Filter messages by keyword.
- **Export Options**: Export conversations as Markdown or JSON with configurable options.
- **View Controls**: Toggle visibility of thinking blocks and tool calls.
- **Mobile Responsive**: Slide-out drawer navigation on mobile devices.
- **Accessible**: Keyboard navigation, focus indicators, ARIA labels.

## Quick Start

### Option 1: Server Mode (Recommended)

```bash
# Install and run
pip install -e .
claude-history
```

This starts a local server at http://localhost:8547 that automatically loads sessions from `~/.claude/projects/`.

### Option 2: Development Mode

```bash
npm install
npm run dev
```

Then run `python server.py` in a separate terminal to provide the API.

### Option 3: Production Build

```bash
npm run build
python server.py
```

## Project Structure

```
claude-history-viewer/
├── src/
│   ├── index.html          # Clean HTML structure
│   ├── styles/
│   │   ├── main.css        # Base styles + CSS variables
│   │   ├── components.css  # Buttons, modals, messages
│   │   └── responsive.css  # Media queries
│   └── ts/
│       ├── main.ts         # Entry point, initialization
│       ├── state.ts        # State management
│       ├── api.ts          # Server API calls
│       ├── parser.ts       # JSONL parsing
│       ├── render.ts       # DOM rendering functions
│       ├── export.ts       # Markdown/JSON export
│       ├── utils.ts        # escapeHtml, redact, format
│       ├── icons.ts        # SVG icons (Lucide)
│       └── types.ts        # TypeScript interfaces
├── dist/                   # Production build output
├── server.py               # Python HTTP server
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Finding Your Conversation Files

Claude Code stores conversation history in:
```
~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
```

To find your files:
```bash
find ~/.claude/projects -name "*.jsonl"
```

## Security Features

The viewer automatically redacts:
- API keys (OpenAI, Anthropic, etc.)
- AWS credentials
- GitHub tokens
- Private keys
- Database connection strings
- Email addresses
- Internal IP addresses

## Privacy

- **No network requests**: The app runs entirely in your browser
- **No tracking**: No analytics or telemetry
- **No storage**: Nothing is saved unless you explicitly export
- **Read-only**: The server never modifies original files

## Development

### Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + production build
npm run typecheck  # Run TypeScript type checking only
npm run preview    # Preview production build
```

### Tech Stack

- **TypeScript**: Strict mode enabled for type safety
- **Vite**: Fast dev server with HMR, optimized production builds
- **CSS**: Modern CSS with custom properties, no preprocessor needed
- **Icons**: Inline SVG from Lucide icon set

## License

MIT
