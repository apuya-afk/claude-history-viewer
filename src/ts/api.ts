/**
 * Server API communication functions
 */
import type { ApiSessionItem, Message } from './types';

interface SessionsResponse {
  sessions?: ApiSessionItem[];
  error?: string;
}

interface SessionResponse {
  messages?: Message[];
  error?: string;
}

interface BackupResponse {
  backed_up?: string[];
  error?: string;
  archive?: string;
  archive_name?: string;
  archive_size_mb?: number;
  session_count?: number;
}

/**
 * Load list of sessions from the server
 */
export async function loadSessions(): Promise<ApiSessionItem[] | null> {
  try {
    const response = await fetch('/api/sessions');
    const data: SessionsResponse = await response.json();
    if (data.error) throw new Error(data.error);
    return data.sessions ?? [];
  } catch (e) {
    console.warn('Server API unavailable:', e);
    return null;
  }
}

interface DeleteResponse {
  success?: boolean;
  deleted?: string;
  error?: string;
}

/**
 * Delete a session file from the server
 */
export async function deleteSession(path: string): Promise<DeleteResponse> {
  try {
    const response = await fetch(`/api/session?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
    return response.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Load a specific session's messages from the server
 */
export async function loadSession(path: string): Promise<Message[] | null> {
  try {
    const response = await fetch(`/api/session?path=${encodeURIComponent(path)}`);
    const data: SessionResponse = await response.json();
    if (data.error) throw new Error(data.error);
    return data.messages ?? null;
  } catch (e) {
    console.error('Failed to load session:', e);
    return null;
  }
}

/**
 * Backup all sessions to local storage
 */
export async function backupAll(): Promise<BackupResponse> {
  const response = await fetch('/api/backup-all');
  return response.json();
}

interface BackupInfo {
  name: string;
  size: number;
  size_mb: number;
  modified: number;
  session_count: number;
}

interface BackupStatusResponse {
  backups: BackupInfo[];
  total_size: number;
}

interface BackupSessionItem extends ApiSessionItem {
  messages?: Message[];
}

interface LoadBackupResponse {
  sessions?: BackupSessionItem[];
  backup_name?: string;
  error?: string;
}

/**
 * Get list of available backups
 */
export async function getBackups(): Promise<BackupStatusResponse> {
  const response = await fetch('/api/backup-status');
  return response.json();
}

/**
 * Load sessions from a backup zip (for viewing)
 */
export async function loadBackup(name: string): Promise<LoadBackupResponse> {
  const response = await fetch(`/api/load-backup?name=${encodeURIComponent(name)}`);
  return response.json();
}

interface RestoreResponse {
  success?: boolean;
  restored_to?: string;
  error?: string;
}

/**
 * Restore a specific session from a backup to Claude history
 */
export async function restoreSession(backupName: string, sessionPath: string): Promise<RestoreResponse> {
  const response = await fetch(
    `/api/restore-session?backup=${encodeURIComponent(backupName)}&session=${encodeURIComponent(sessionPath)}`
  );
  return response.json();
}
