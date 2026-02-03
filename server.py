#!/usr/bin/env python3
"""
Local server for Claude Code History Viewer
Serves the viewer and provides API access to ~/.claude/projects/ JSONL files
"""

import http.server
import json
import os
import shutil
import socketserver
import webbrowser
from pathlib import Path
from urllib.parse import urlparse, parse_qs

PORT = 8547
CLAUDE_DIR = Path.home() / ".claude" / "projects"
BACKUP_DIR = Path(__file__).parent / "backups"

class HistoryHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from the script's directory
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def do_POST(self):
        parsed = urlparse(self.path)

        # API: Backup sessions
        if parsed.path == "/api/backup":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
            try:
                params = json.loads(body)
            except:
                params = {}
            self.send_json(self.backup_sessions(params.get('paths', [])))
            return

        self.send_error(404, "Not Found")

    def do_GET(self):
        parsed = urlparse(self.path)

        # API: List all sessions
        if parsed.path == "/api/sessions":
            self.send_json(self.list_sessions())
            return

        # API: Get session content
        if parsed.path == "/api/session":
            params = parse_qs(parsed.query)
            if "path" in params:
                session_path = params["path"][0]
                self.send_json(self.get_session(session_path))
                return
            self.send_error(400, "Missing path parameter")
            return

        # API: Backup all sessions
        if parsed.path == "/api/backup-all":
            self.send_json(self.backup_all_sessions())
            return

        # API: Get backup status
        if parsed.path == "/api/backup-status":
            self.send_json(self.get_backup_status())
            return

        # Serve static files
        super().do_GET()

    def list_sessions(self):
        """List all JSONL session files"""
        sessions = []

        if not CLAUDE_DIR.exists():
            return {"error": f"Claude directory not found: {CLAUDE_DIR}", "sessions": []}

        for jsonl_file in CLAUDE_DIR.rglob("*.jsonl"):
            # Skip subagent files for cleaner list
            if "/subagents/" in str(jsonl_file):
                continue

            try:
                # Get first user message for preview
                preview = ""
                timestamp = None
                message_count = 0
                cwd = ""

                with open(jsonl_file, "r") as f:
                    for line in f:
                        try:
                            obj = json.loads(line)
                            if obj.get("type") == "user":
                                message_count += 1
                                if not preview and obj.get("message", {}).get("content"):
                                    content = obj["message"]["content"]
                                    if isinstance(content, str):
                                        preview = content[:100]
                                if not timestamp:
                                    timestamp = obj.get("timestamp")
                                if not cwd:
                                    cwd = obj.get("cwd", "")
                            elif obj.get("type") == "assistant":
                                message_count += 1
                        except json.JSONDecodeError:
                            continue

                # Only include sessions with at least 1 message
                if message_count > 0:
                    sessions.append({
                        "path": str(jsonl_file),
                        "name": jsonl_file.name,
                        "preview": preview,
                        "timestamp": timestamp,
                        "messageCount": message_count,
                        "cwd": cwd
                    })
            except Exception as e:
                continue

        # Sort by timestamp, newest first
        sessions.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

        return {"sessions": sessions}

    def get_session(self, path):
        """Get contents of a session file with security filtering"""
        # Security: Ensure path is within CLAUDE_DIR
        try:
            requested_path = Path(path).resolve()
            if not str(requested_path).startswith(str(CLAUDE_DIR.resolve())):
                return {"error": "Access denied: Path outside allowed directory"}
        except Exception:
            return {"error": "Invalid path"}

        if not requested_path.exists():
            return {"error": "Session file not found"}

        messages = []
        try:
            with open(requested_path, "r") as f:
                for line in f:
                    try:
                        obj = json.loads(line)
                        if obj.get("type") in ("user", "assistant"):
                            # Filter out sensitive fields we don't need
                            filtered = {
                                "type": obj.get("type"),
                                "message": obj.get("message"),
                                "timestamp": obj.get("timestamp"),
                                "uuid": obj.get("uuid"),
                                "sessionId": obj.get("sessionId"),
                                "cwd": obj.get("cwd"),
                                "version": obj.get("version"),
                                "gitBranch": obj.get("gitBranch")
                            }
                            messages.append(filtered)
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            return {"error": f"Failed to read session: {str(e)}"}

        return {"messages": messages, "path": str(requested_path)}

    def backup_sessions(self, paths):
        """Backup specific session files"""
        BACKUP_DIR.mkdir(exist_ok=True)
        backed_up = []
        errors = []

        for path in paths:
            try:
                requested_path = Path(path).resolve()
                if not str(requested_path).startswith(str(CLAUDE_DIR.resolve())):
                    errors.append({"path": path, "error": "Access denied"})
                    continue

                if not requested_path.exists():
                    errors.append({"path": path, "error": "File not found"})
                    continue

                # Create backup with timestamp and original structure hint
                rel_path = requested_path.relative_to(CLAUDE_DIR)
                backup_name = f"{rel_path.parent.name}_{requested_path.stem}.jsonl"
                backup_path = BACKUP_DIR / backup_name

                # Copy file
                shutil.copy2(requested_path, backup_path)
                backed_up.append({"original": str(requested_path), "backup": str(backup_path)})

            except Exception as e:
                errors.append({"path": path, "error": str(e)})

        return {"backed_up": backed_up, "errors": errors}

    def backup_all_sessions(self):
        """Backup all session files"""
        if not CLAUDE_DIR.exists():
            return {"error": "Claude directory not found", "backed_up": [], "errors": []}

        all_paths = []
        for jsonl_file in CLAUDE_DIR.rglob("*.jsonl"):
            # Skip subagent files
            if "/subagents/" in str(jsonl_file):
                continue
            all_paths.append(str(jsonl_file))

        return self.backup_sessions(all_paths)

    def get_backup_status(self):
        """Get info about existing backups"""
        if not BACKUP_DIR.exists():
            return {"backups": [], "total_size": 0}

        backups = []
        total_size = 0

        for backup_file in BACKUP_DIR.glob("*.jsonl"):
            stat = backup_file.stat()
            backups.append({
                "name": backup_file.name,
                "size": stat.st_size,
                "modified": stat.st_mtime
            })
            total_size += stat.st_size

        backups.sort(key=lambda x: x["modified"], reverse=True)

        return {"backups": backups, "total_size": total_size}

    def send_json(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass


def main():
    # Allow port reuse to avoid "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", PORT), HistoryHandler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"Claude Code History Viewer")
            print(f"Server running at {url}")
            print(f"Loading {len(list(CLAUDE_DIR.rglob('*.jsonl')))} session files...")
            print(f"Press Ctrl+C to stop\n")

            # Open browser after server is ready
            import threading
            threading.Timer(0.5, lambda: webbrowser.open(url)).start()

            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Port {PORT} is already in use.")
            print(f"Either close the existing server or open http://localhost:{PORT}")
            webbrowser.open(f"http://localhost:{PORT}")
        else:
            raise


if __name__ == "__main__":
    main()
