/**
 * Global application state management
 */
import type { AppState, Session } from './types';

/** Initial application state */
export const state: AppState = {
  sessions: [],
  currentSession: null,
  showThinking: true,
  showTools: false,
  redactSecrets: true,
  isServerMode: window.location.protocol.startsWith('http'),
};

/** Update sessions list */
export function setSessions(sessions: Session[]): void {
  state.sessions = sessions;
}

/** Set the currently selected session */
export function setCurrentSession(index: number | null): void {
  state.currentSession = index;
}

/** Toggle thinking blocks visibility */
export function toggleThinking(): boolean {
  state.showThinking = !state.showThinking;
  return state.showThinking;
}

/** Toggle tool calls visibility */
export function toggleTools(): boolean {
  state.showTools = !state.showTools;
  return state.showTools;
}

/** Toggle secret redaction */
export function toggleRedact(): boolean {
  state.redactSecrets = !state.redactSecrets;
  return state.redactSecrets;
}

/** Get the current session or null */
export function getCurrentSession(): Session | null {
  if (state.currentSession === null) return null;
  return state.sessions[state.currentSession] ?? null;
}
