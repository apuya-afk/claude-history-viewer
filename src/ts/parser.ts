/**
 * JSONL file parsing
 */
import type { Message, Session, SessionInfo } from './types';

interface ParsedSession {
  messages: Message[];
  sessionInfo: SessionInfo | null;
  filename: string;
}

/**
 * Parses a JSONL file containing Claude conversation history
 */
export function parseJSONL(content: string, filename: string): ParsedSession {
  const lines = content.trim().split('\n');
  const messages: Message[] = [];
  let sessionInfo: SessionInfo | null = null;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as Message;
      if (obj.type === 'user' || obj.type === 'assistant') {
        messages.push(obj);
        if (!sessionInfo && obj.sessionId) {
          sessionInfo = {
            id: obj.sessionId,
            cwd: obj.cwd,
            version: obj.version,
            branch: obj.gitBranch,
          };
        }
      }
    } catch {
      // Skip invalid lines
    }
  }

  return { messages, sessionInfo, filename };
}

/**
 * Convert API session items to Session format
 */
export function apiToSession(item: {
  path: string;
  name: string;
  cwd?: string;
  preview?: string;
  timestamp?: string;
  messageCount?: number;
}): Session {
  return {
    path: item.path,
    filename: item.name,
    messages: [],
    sessionInfo: {
      cwd: item.cwd,
      preview: item.preview,
      timestamp: item.timestamp,
      messageCount: item.messageCount,
    },
  };
}
