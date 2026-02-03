# Claude Code History Viewer

A secure, local-only web app to view and export Claude Code conversation history from `~/.claude/projects/**/*.jsonl` files.

## Features

- **Local Processing**: All files are processed in your browser. No data is sent to any server.
- **Secret Redaction**: Automatically detects and redacts API keys, tokens, passwords, and other sensitive information.
- **Multiple Sessions**: Load and browse multiple conversation sessions.
- **Search**: Filter messages by keyword.
- **Export Options**: Export conversations as Markdown or JSON with configurable options.
- **View Controls**: Toggle visibility of thinking blocks and tool calls.

## Usage

1. Open `index.html` in your browser
2. Click "Load JSONL Files" or drag-and-drop `.jsonl` files from `~/.claude/projects/`
3. Browse conversations in the sidebar
4. Use toolbar options to toggle thinking blocks, tool calls, and secret redaction
5. Export conversations using the Export button

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

## Development

This is a single-file HTML application with no dependencies. Simply edit `index.html` to customize.

## License

MIT
