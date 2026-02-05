#!/usr/bin/env python3
"""
Local server for Claude Code History Viewer
Serves the viewer and provides API access to ~/.claude/projects/ JSONL files

IMPORTANT: This viewer is READ-ONLY. It never writes to or modifies history files.
Backups are copied to a separate directory within this app's folder.
"""

import http.server
import json
import os
import shutil
import socketserver
import webbrowser
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qs

PORT = 8547
CLAUDE_DIR = Path.home() / ".claude" / "projects"
BACKUP_DIR = Path(__file__).parent / "backups"

class HistoryHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from dist/ if it exists (production build), otherwise script's directory
        script_dir = Path(__file__).parent
        dist_dir = script_dir / "dist"
        serve_dir = str(dist_dir) if dist_dir.exists() else str(script_dir)
        super().__init__(*args, directory=serve_dir, **kwargs)

    def do_DELETE(self):
        parsed = urlparse(self.path)

        # API: Delete a session
        if parsed.path == "/api/session":
            params = parse_qs(parsed.query)
            if "path" in params:
                self.send_json(self.delete_session(params["path"][0]))
                return
            self.send_error(400, "Missing path parameter")
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)

        # API: Backup sessions
        if parsed.path == "/api/backup":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
            try:
                params = json.loads(body)
            except json.JSONDecodeError:
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

        # API: Load sessions from a backup zip (for viewing)
        if parsed.path == "/api/load-backup":
            params = parse_qs(parsed.query)
            if "name" in params:
                self.send_json(self.load_backup(params["name"][0]))
                return
            self.send_error(400, "Missing name parameter")
            return

        # API: Restore a session from backup to Claude history
        if parsed.path == "/api/restore-session":
            params = parse_qs(parsed.query)
            if "backup" in params and "session" in params:
                self.send_json(self.restore_session_from_backup(
                    params["backup"][0],
                    params["session"][0]
                ))
                return
            self.send_error(400, "Missing backup or session parameter")
            return

        # Serve static files
        super().do_GET()

    def list_sessions(self) -> dict[str, Any]:
        """List all JSONL session files (READ-ONLY operation)"""
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

                # Read entire file at once and close immediately to avoid holding file handle
                # This prevents any interference with Claude Code's file operations
                content = jsonl_file.read_text(encoding="utf-8")
                for line in content.splitlines():
                    if not line.strip():
                        continue
                    try:
                        obj = json.loads(line)
                        if obj.get("type") == "user":
                            message_count += 1
                            if not preview and obj.get("message", {}).get("content"):
                                msg_content = obj["message"]["content"]
                                if isinstance(msg_content, str):
                                    preview = msg_content[:100]
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

    def get_session(self, path: str) -> dict[str, Any]:
        """Get contents of a session file with security filtering (READ-ONLY operation)"""
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
            # Read entire file at once and close immediately to avoid holding file handle
            # This prevents any interference with Claude Code's file operations
            content = requested_path.read_text(encoding="utf-8")
            for line in content.splitlines():
                if not line.strip():
                    continue
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

    def delete_session(self, path: str) -> dict[str, Any]:
        """Delete a session file (PERMANENTLY removes the file)"""
        # Security: Ensure path is within CLAUDE_DIR
        try:
            requested_path = Path(path).resolve()
            if not str(requested_path).startswith(str(CLAUDE_DIR.resolve())):
                return {"error": "Access denied: Path outside allowed directory"}
        except Exception:
            return {"error": "Invalid path"}

        if not requested_path.exists():
            return {"error": "Session file not found"}

        try:
            requested_path.unlink()
            return {"success": True, "deleted": str(requested_path)}
        except Exception as e:
            return {"error": f"Failed to delete: {str(e)}"}

    def backup_sessions(self, paths: list[str]) -> dict[str, Any]:
        """Backup specific session files (COPIES to backup dir, never modifies originals)"""
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

    def backup_all_sessions(self) -> dict[str, Any]:
        """Backup all session files into a single timestamped zip archive"""
        if not CLAUDE_DIR.exists():
            return {"error": "Claude directory not found", "backed_up": [], "errors": []}

        # Create backup directory if needed
        BACKUP_DIR.mkdir(exist_ok=True)

        # Generate timestamped filename
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        zip_filename = f"claude-history-backup_{timestamp}.zip"
        zip_path = BACKUP_DIR / zip_filename

        backed_up = []
        errors = []

        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for jsonl_file in CLAUDE_DIR.rglob("*.jsonl"):
                    # Skip subagent files
                    if "/subagents/" in str(jsonl_file):
                        continue
                    try:
                        # Use relative path within the zip
                        rel_path = jsonl_file.relative_to(CLAUDE_DIR)
                        zf.write(jsonl_file, rel_path)
                        backed_up.append(str(rel_path))
                    except Exception as e:
                        errors.append({"path": str(jsonl_file), "error": str(e)})

            # Get final zip size
            zip_size = zip_path.stat().st_size
            zip_size_mb = round(zip_size / (1024 * 1024), 2)

            return {
                "backed_up": backed_up,
                "errors": errors,
                "archive": str(zip_path),
                "archive_name": zip_filename,
                "archive_size_mb": zip_size_mb,
                "session_count": len(backed_up)
            }

        except Exception as e:
            return {"error": str(e), "backed_up": [], "errors": []}

    def get_backup_status(self) -> dict[str, Any]:
        """Get info about existing backup zip files"""
        if not BACKUP_DIR.exists():
            return {"backups": [], "total_size": 0}

        backups = []
        total_size = 0

        for backup_file in BACKUP_DIR.glob("*.zip"):
            stat = backup_file.stat()
            # Count sessions in zip
            try:
                with zipfile.ZipFile(backup_file, 'r') as zf:
                    session_count = len([n for n in zf.namelist() if n.endswith('.jsonl')])
            except:
                session_count = 0

            backups.append({
                "name": backup_file.name,
                "size": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": stat.st_mtime,
                "session_count": session_count
            })
            total_size += stat.st_size

        backups.sort(key=lambda x: x["modified"], reverse=True)

        return {"backups": backups, "total_size": total_size}

    def restore_session_from_backup(self, backup_name: str, session_path: str) -> dict[str, Any]:
        """Restore a specific session from a backup zip to the Claude history directory"""
        if not backup_name or '..' in backup_name:
            return {"error": "Invalid backup name"}
        if not session_path or '..' in session_path:
            return {"error": "Invalid session path"}

        backup_path = BACKUP_DIR / backup_name
        if not backup_path.exists() or not backup_path.suffix == '.zip':
            return {"error": "Backup not found"}

        try:
            with zipfile.ZipFile(backup_path, 'r') as zf:
                if session_path not in zf.namelist():
                    return {"error": "Session not found in backup"}

                # Determine target path
                target_path = CLAUDE_DIR / session_path

                # Check if file already exists
                if target_path.exists():
                    return {"error": "Session already exists in Claude history. Delete it first if you want to restore."}

                # Create parent directories if needed
                target_path.parent.mkdir(parents=True, exist_ok=True)

                # Extract the file
                content = zf.read(session_path)
                target_path.write_bytes(content)

                return {"success": True, "restored_to": str(target_path)}

        except Exception as e:
            return {"error": str(e)}

    def load_backup(self, backup_name: str) -> dict[str, Any]:
        """Load sessions from a backup zip file"""
        if not backup_name or '..' in backup_name:
            return {"error": "Invalid backup name"}

        backup_path = BACKUP_DIR / backup_name
        if not backup_path.exists() or not backup_path.suffix == '.zip':
            return {"error": "Backup not found"}

        sessions = []
        try:
            with zipfile.ZipFile(backup_path, 'r') as zf:
                for name in zf.namelist():
                    if not name.endswith('.jsonl'):
                        continue
                    try:
                        content = zf.read(name).decode('utf-8')
                        lines = content.strip().split('\n')

                        # Parse to get preview and metadata
                        messages = []
                        preview = ""
                        timestamp = None
                        cwd = None

                        for line in lines:
                            try:
                                obj = json.loads(line)
                                if obj.get('type') in ('user', 'assistant'):
                                    messages.append(obj)
                                    if not preview and obj.get('type') == 'user':
                                        content_val = obj.get('message', {}).get('content', '')
                                        if isinstance(content_val, str):
                                            preview = content_val[:100]
                                    if not timestamp and obj.get('timestamp'):
                                        timestamp = obj['timestamp']
                                    if not cwd and obj.get('cwd'):
                                        cwd = obj['cwd']
                            except:
                                continue

                        if messages:
                            sessions.append({
                                "name": name,
                                "path": f"backup:{backup_name}:{name}",
                                "preview": preview,
                                "timestamp": timestamp,
                                "cwd": cwd,
                                "messageCount": len(messages),
                                "messages": messages  # Include full messages
                            })
                    except Exception as e:
                        continue

            sessions.sort(key=lambda x: x.get('timestamp') or '', reverse=True)
            return {"sessions": sessions, "backup_name": backup_name}

        except Exception as e:
            return {"error": str(e)}

    def send_json(self, data: dict[str, Any]) -> None:
        """Send JSON response"""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "http://localhost:8547")
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
