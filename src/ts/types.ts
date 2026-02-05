/**
 * TypeScript interfaces for Claude History Viewer
 */

/** Content block types in assistant messages */
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  content: string | unknown;
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

/** Token usage statistics */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

/** Message content wrapper */
export interface MessageContent {
  content: string | ContentBlock[];
  usage?: TokenUsage;
}

/** Individual conversation message */
export interface Message {
  type: 'user' | 'assistant';
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  message?: MessageContent;
}

/** Session metadata */
export interface SessionInfo {
  id?: string;
  cwd?: string;
  version?: string;
  branch?: string;
  preview?: string;
  timestamp?: string;
  messageCount?: number;
}

/** Loaded session data */
export interface Session {
  path?: string;
  filename: string;
  messages: Message[];
  sessionInfo?: SessionInfo;
}

/** API session list response item */
export interface ApiSessionItem {
  path: string;
  name: string;
  cwd?: string;
  preview?: string;
  timestamp?: string;
  messageCount?: number;
}

/** Application state */
export interface AppState {
  sessions: Session[];
  currentSession: number | null;
  showThinking: boolean;
  showTools: boolean;
  redactSecrets: boolean;
  isServerMode: boolean;
}

/** DOM element references */
export interface DOMElements {
  fileInput: HTMLInputElement;
  loadDefaultBtn: HTMLButtonElement;
  backupAllBtn: HTMLButtonElement;
  loadBackupBtn: HTMLButtonElement;
  loadBackupModal: HTMLElement;
  backupList: HTMLElement;
  backupContentHeader: HTMLElement;
  backupSessions: HTMLElement;
  sessionList: HTMLElement;
  messagesContainer: HTMLElement;
  toggleThinking: HTMLButtonElement;
  toggleTools: HTMLButtonElement;
  toggleRedact: HTMLButtonElement;
  searchBox: HTMLInputElement;
  exportBtn: HTMLButtonElement;
  exportModal: HTMLElement;
  deleteBtn: HTMLButtonElement;
  deleteModal: HTMLElement;
  deleteSessionName: HTMLElement;
  statsBar: HTMLElement;
  messageCount: HTMLElement;
  tokenCount: HTMLElement;
  sessionDuration: HTMLElement;
  mobileMenuBtn: HTMLButtonElement;
  sidebar: HTMLElement;
  sidebarOverlay: HTMLElement;
}

/** Export options for modal */
export interface ExportOptions {
  includeThinking: boolean;
  includeTools: boolean;
  redact: boolean;
  includeMetadata: boolean;
}
