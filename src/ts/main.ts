/**
 * Main entry point - initialization and event listeners
 */
import type { DOMElements, Session } from './types';
import {
  state,
  setCurrentSession,
  setSessions,
  toggleThinking,
  toggleTools,
  toggleRedact,
  getCurrentSession,
} from './state';
import { loadSessions, loadSession, backupAll, deleteSession, getBackups, loadBackup, restoreSession } from './api';
import { parseJSONL, apiToSession } from './parser';
import {
  renderSessionList,
  renderMessages,
  showLoading,
  showSessionListLoading,
} from './render';
import { exportAsMarkdown, exportAsJson, getExportOptions } from './export';
import { escapeHtml } from './utils';
import { icon } from './icons';
import { toastSuccess, toastError, toastInfo } from './toast';
import { initTheme, cycleTheme, getStoredTheme, getThemeLabel } from './theme';
import {
  registerShortcut,
  initKeyboardShortcuts,
  showKeyboardHelp,
} from './keyboard';

// Import styles
import '../styles/main.css';
import '../styles/components.css';
import '../styles/responsive.css';
import '../styles/enhancements.css';

/**
 * Get typed DOM element references
 */
function getElements(): DOMElements {
  return {
    fileInput: document.getElementById('fileInput') as HTMLInputElement,
    loadDefaultBtn: document.getElementById('loadDefaultBtn') as HTMLButtonElement,
    backupAllBtn: document.getElementById('backupAllBtn') as HTMLButtonElement,
    loadBackupBtn: document.getElementById('loadBackupBtn') as HTMLButtonElement,
    loadBackupModal: document.getElementById('loadBackupModal') as HTMLElement,
    backupList: document.getElementById('backupList') as HTMLElement,
    backupContentHeader: document.getElementById('backupContentHeader') as HTMLElement,
    backupSessions: document.getElementById('backupSessions') as HTMLElement,
    sessionList: document.getElementById('sessionList') as HTMLElement,
    messagesContainer: document.getElementById('messagesContainer') as HTMLElement,
    toggleThinking: document.getElementById('toggleThinking') as HTMLButtonElement,
    toggleTools: document.getElementById('toggleTools') as HTMLButtonElement,
    toggleRedact: document.getElementById('toggleRedact') as HTMLButtonElement,
    searchBox: document.getElementById('searchBox') as HTMLInputElement,
    exportBtn: document.getElementById('exportBtn') as HTMLButtonElement,
    exportModal: document.getElementById('exportModal') as HTMLElement,
    deleteBtn: document.getElementById('deleteBtn') as HTMLButtonElement,
    deleteModal: document.getElementById('deleteModal') as HTMLElement,
    deleteSessionName: document.getElementById('deleteSessionName') as HTMLElement,
    statsBar: document.getElementById('statsBar') as HTMLElement,
    messageCount: document.getElementById('messageCount') as HTMLElement,
    tokenCount: document.getElementById('tokenCount') as HTMLElement,
    sessionDuration: document.getElementById('sessionDuration') as HTMLElement,
    mobileMenuBtn: document.getElementById('mobileMenuBtn') as HTMLButtonElement,
    sidebar: document.querySelector('.sidebar') as HTMLElement,
    sidebarOverlay: document.getElementById('sidebarOverlay') as HTMLElement,
  };
}

let elements: DOMElements;

/**
 * Select and load a session by index
 */
async function selectSession(idx: number): Promise<void> {
  setCurrentSession(idx);
  renderSessionList(elements);

  // Close mobile sidebar after selection
  closeMobileSidebar();

  const session = state.sessions[idx];
  if (session?.path && session.messages.length === 0) {
    showLoading(elements);
    const messages = await loadSession(session.path);
    if (messages) {
      session.messages = messages;
      session.sessionInfo = {
        ...session.sessionInfo,
        id: messages[0]?.sessionId,
        cwd: messages[0]?.cwd,
      };
    }
  }

  renderMessages(elements);
  attachCopyButtonListeners();
}

/**
 * Navigate to previous/next session
 */
function navigateSession(direction: 'prev' | 'next'): void {
  if (state.sessions.length === 0) return;

  let newIndex: number;
  if (state.currentSession === null) {
    newIndex = 0;
  } else if (direction === 'prev') {
    newIndex = Math.max(0, state.currentSession - 1);
  } else {
    newIndex = Math.min(state.sessions.length - 1, state.currentSession + 1);
  }

  if (newIndex !== state.currentSession) {
    selectSession(newIndex);
  }
}

/**
 * Load sessions from the server
 */
async function loadFromServer(): Promise<boolean> {
  showSessionListLoading(elements);
  const sessions = await loadSessions();
  if (sessions && sessions.length > 0) {
    setSessions(sessions.map(apiToSession));
    renderSessionList(elements);
    attachSessionListeners();
    return true;
  }
  elements.sessionList.innerHTML = `
    <div class="empty-state">
      <p>No sessions found. Make sure the Python server is running.</p>
    </div>
  `;
  return false;
}

/**
 * Handle file input (drag-drop or file picker)
 */
async function handleFileInput(files: File[]): Promise<void> {
  const newSessions: Session[] = [];
  for (const file of files) {
    const content = await file.text();
    const parsed = parseJSONL(content, file.name);
    if (parsed.messages.length > 0) {
      newSessions.push({
        filename: parsed.filename,
        messages: parsed.messages,
        sessionInfo: parsed.sessionInfo ?? undefined,
      });
    }
  }
  setSessions(newSessions);
  renderSessionList(elements);
  attachSessionListeners();
  if (state.sessions.length > 0) {
    await selectSession(0);
    toastSuccess(`Loaded ${state.sessions.length} session(s)`);
  }
}

/**
 * Handle backup all button
 */
async function handleBackup(): Promise<void> {
  if (!state.isServerMode) {
    toastError('Backup requires server mode. Run: python server.py');
    return;
  }

  const btn = elements.backupAllBtn;
  btn.innerHTML = `${icon('loader')} Backing up...`;
  btn.disabled = true;

  try {
    const data = await backupAll();
    if (data.error) {
      toastError('Backup error: ' + data.error);
    } else {
      const count = data.session_count ?? data.backed_up?.length ?? 0;
      const sizeMb = data.archive_size_mb ?? 0;
      const archiveName = data.archive_name ?? 'backup.zip';
      toastSuccess(`${count} sessions saved to ${archiveName} (${sizeMb}MB)`, { duration: 6000 });
    }
  } catch (e) {
    toastError('Backup failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
  } finally {
    btn.innerHTML = `${icon('save')} Backup`;
    btn.disabled = false;
  }
}

/**
 * Render the backup list in the modal (two-panel view)
 */
async function renderBackupList(): Promise<void> {
  elements.backupList.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
  elements.backupContentHeader.textContent = 'Select a backup';
  elements.backupSessions.innerHTML = '<div class="empty-state"><p>Choose a backup from the left to browse its sessions</p></div>';

  try {
    const data = await getBackups();

    if (!data.backups || data.backups.length === 0) {
      elements.backupList.innerHTML = '<div class="no-backups">No backups found</div>';
      return;
    }

    elements.backupList.innerHTML = data.backups.map(backup => {
      const date = new Date(backup.modified * 1000).toLocaleDateString();
      return `
        <div class="backup-item" data-backup="${backup.name}" tabindex="0" role="button">
          <div class="backup-info">
            <div class="backup-name">${backup.name.replace('claude-history-backup_', '').replace('.zip', '')}</div>
            <div class="backup-meta">
              <span>${backup.session_count} sessions</span>
              <span>${date}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers to backup items
    elements.backupList.querySelectorAll('.backup-item').forEach(item => {
      item.addEventListener('click', () => selectBackup((item as HTMLElement).dataset.backup ?? ''));
    });

  } catch (e) {
    elements.backupList.innerHTML = '<div class="no-backups">Failed to load backups</div>';
  }
}

/**
 * Select a backup and show its sessions
 */
async function selectBackup(backupName: string): Promise<void> {
  // Update selected state in sidebar
  elements.backupList.querySelectorAll('.backup-item').forEach(item => {
    item.classList.toggle('selected', (item as HTMLElement).dataset.backup === backupName);
  });

  elements.backupContentHeader.textContent = `Loading ${backupName}...`;
  elements.backupSessions.innerHTML = '<div class="empty-state"><p>Loading sessions...</p></div>';

  const result = await loadBackup(backupName);

  if (result.error) {
    elements.backupContentHeader.textContent = 'Error';
    elements.backupSessions.innerHTML = `<div class="no-backups">${result.error}</div>`;
    return;
  }

  if (!result.sessions || result.sessions.length === 0) {
    elements.backupContentHeader.textContent = backupName;
    elements.backupSessions.innerHTML = '<div class="no-backups">No sessions in this backup</div>';
    return;
  }

  elements.backupContentHeader.textContent = `${result.sessions.length} sessions in backup`;

  elements.backupSessions.innerHTML = result.sessions.map(session => {
    const date = session.timestamp ? new Date(session.timestamp).toLocaleString() : 'Unknown date';
    const preview = session.preview || 'No preview';
    return `
      <div class="backup-session-item" data-session="${session.name}" data-backup="${backupName}">
        <div class="backup-session-info">
          <div class="backup-session-preview">${escapeHtml(preview)}</div>
          <div class="backup-session-meta">
            <span>${session.messageCount ?? 0} messages</span>
            <span>${date}</span>
          </div>
        </div>
        <div class="backup-session-actions">
          <button class="btn btn-view" type="button" data-action="view">View</button>
          <button class="btn btn-restore" type="button" data-action="restore">Restore</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach handlers to session actions
  elements.backupSessions.querySelectorAll('.backup-session-item').forEach(item => {
    const sessionName = (item as HTMLElement).dataset.session ?? '';
    const backup = (item as HTMLElement).dataset.backup ?? '';

    item.querySelector('[data-action="view"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Load this specific backup and select this session
      elements.loadBackupModal.classList.remove('active');
      showSessionListLoading(elements);

      const backupData = await loadBackup(backup);
      if (backupData.sessions) {
        setSessions(backupData.sessions.map(s => ({
          path: s.path,
          filename: s.name,
          messages: s.messages ?? [],
          sessionInfo: {
            preview: s.preview,
            timestamp: s.timestamp,
            cwd: s.cwd,
            messageCount: s.messageCount,
          },
        })));
        renderSessionList(elements);
        attachSessionListeners();

        // Find and select the specific session
        const idx = backupData.sessions.findIndex(s => s.name === sessionName);
        if (idx >= 0) {
          await selectSession(idx);
        } else if (state.sessions.length > 0) {
          await selectSession(0);
        }
        toastInfo(`Viewing backup: ${backup}`);
      }
    });

    item.querySelector('[data-action="restore"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await restoreSession(backup, sessionName);
      if (result.error) {
        toastError(result.error);
      } else {
        toastSuccess('Session restored to Claude history');
        // Refresh the main session list
        await loadFromServer();
      }
    });
  });
}

/**
 * Open mobile sidebar
 */
function openMobileSidebar(): void {
  elements.sidebar.classList.add('open');
  elements.sidebarOverlay.classList.add('active');
  elements.mobileMenuBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

/**
 * Close mobile sidebar
 */
function closeMobileSidebar(): void {
  elements.sidebar.classList.remove('open');
  elements.sidebarOverlay.classList.remove('active');
  elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/**
 * Attach event listeners to session items
 */
function attachSessionListeners(): void {
  const items = document.querySelectorAll('.session-item');
  items.forEach((item) => {
    const handleSelect = () => {
      const idx = parseInt((item as HTMLElement).dataset.idx ?? '0', 10);
      selectSession(idx);
    };

    item.addEventListener('click', handleSelect);
    item.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

/**
 * Attach copy button listeners for code blocks
 */
function attachCopyButtonListeners(): void {
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const codeId = (btn as HTMLElement).dataset.codeId;
      if (!codeId) return;

      const codeEl = document.getElementById(codeId);
      const code = codeEl?.textContent ?? '';

      try {
        await navigator.clipboard.writeText(code);
        btn.classList.add('copied');
        const span = btn.querySelector('span');
        if (span) span.textContent = 'Copied!';

        setTimeout(() => {
          btn.classList.remove('copied');
          if (span) span.textContent = 'Copy';
        }, 2000);
      } catch {
        toastError('Failed to copy to clipboard');
      }
    });
  });
}

/**
 * Update theme toggle button icon
 */
function updateThemeIcon(): void {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const theme = getStoredTheme();
  let iconName: 'sun' | 'moon' | 'monitor';
  if (theme === 'light') iconName = 'sun';
  else if (theme === 'dark') iconName = 'moon';
  else iconName = 'monitor';

  themeToggle.innerHTML = icon(iconName);
  themeToggle.setAttribute('aria-label', `Theme: ${getThemeLabel(theme)}. Click to change.`);
}

/**
 * Register keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  registerShortcut({
    key: '/',
    description: 'Focus search',
    action: () => elements.searchBox.focus(),
  });

  registerShortcut({
    key: 'j',
    description: 'Next session',
    action: () => navigateSession('next'),
  });

  registerShortcut({
    key: 'k',
    description: 'Previous session',
    action: () => navigateSession('prev'),
  });

  registerShortcut({
    key: 't',
    description: 'Toggle thinking blocks',
    action: () => {
      const isActive = toggleThinking();
      elements.toggleThinking.classList.toggle('active', isActive);
      elements.toggleThinking.setAttribute('aria-pressed', String(isActive));
      renderMessages(elements);
      attachCopyButtonListeners();
      toastInfo(`Thinking blocks ${isActive ? 'shown' : 'hidden'}`);
    },
  });

  registerShortcut({
    key: 'o',
    description: 'Toggle tool calls',
    action: () => {
      const isActive = toggleTools();
      elements.toggleTools.classList.toggle('active', isActive);
      elements.toggleTools.setAttribute('aria-pressed', String(isActive));
      renderMessages(elements);
      attachCopyButtonListeners();
      toastInfo(`Tool calls ${isActive ? 'shown' : 'hidden'}`);
    },
  });

  registerShortcut({
    key: 'r',
    description: 'Toggle redaction',
    action: () => {
      const isActive = toggleRedact();
      elements.toggleRedact.classList.toggle('active', isActive);
      elements.toggleRedact.setAttribute('aria-pressed', String(isActive));
      renderMessages(elements);
      attachCopyButtonListeners();
      toastInfo(`Secret redaction ${isActive ? 'enabled' : 'disabled'}`);
    },
  });

  registerShortcut({
    key: 'e',
    description: 'Export conversation',
    action: () => {
      if (state.currentSession !== null) {
        elements.exportModal.classList.add('active');
      }
    },
  });

  registerShortcut({
    key: 'Escape',
    description: 'Close modal/sidebar',
    action: () => {
      elements.exportModal.classList.remove('active');
      elements.deleteModal.classList.remove('active');
      elements.loadBackupModal.classList.remove('active');
      closeMobileSidebar();
    },
  });

  registerShortcut({
    key: '?',
    shift: true,
    description: 'Show keyboard shortcuts',
    action: showKeyboardHelp,
  });

  initKeyboardShortcuts();
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  // Initialize theme
  initTheme();

  elements = getElements();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // File input
  elements.fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      handleFileInput(Array.from(target.files));
    }
  });

  // Refresh button
  elements.loadDefaultBtn.addEventListener('click', async () => {
    if (state.isServerMode) {
      const loaded = await loadFromServer();
      if (loaded && state.sessions.length > 0) {
        await selectSession(0);
      }
    } else {
      toastError('Server mode required. Run: python server.py');
    }
  });

  // Backup button
  elements.backupAllBtn.addEventListener('click', () => handleBackup());

  // Load backup button
  elements.loadBackupBtn.addEventListener('click', () => {
    if (!state.isServerMode) {
      toastError('Restore requires server mode. Run: python server.py');
      return;
    }
    elements.loadBackupModal.classList.add('active');
    renderBackupList();
  });

  document.getElementById('cancelLoadBackup')?.addEventListener('click', () => {
    elements.loadBackupModal.classList.remove('active');
  });

  elements.loadBackupModal.addEventListener('click', (e) => {
    if (e.target === elements.loadBackupModal) {
      elements.loadBackupModal.classList.remove('active');
    }
  });

  // Toggle buttons
  elements.toggleThinking.addEventListener('click', () => {
    const isActive = toggleThinking();
    elements.toggleThinking.classList.toggle('active', isActive);
    elements.toggleThinking.setAttribute('aria-pressed', String(isActive));
    renderMessages(elements);
    attachCopyButtonListeners();
  });

  elements.toggleTools.addEventListener('click', () => {
    const isActive = toggleTools();
    elements.toggleTools.classList.toggle('active', isActive);
    elements.toggleTools.setAttribute('aria-pressed', String(isActive));
    renderMessages(elements);
    attachCopyButtonListeners();
  });

  elements.toggleRedact.addEventListener('click', () => {
    const isActive = toggleRedact();
    elements.toggleRedact.classList.toggle('active', isActive);
    elements.toggleRedact.setAttribute('aria-pressed', String(isActive));
    renderMessages(elements);
    attachCopyButtonListeners();
  });

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    updateThemeIcon();
    themeToggle.addEventListener('click', () => {
      const newTheme = cycleTheme();
      updateThemeIcon();
      toastInfo(`Theme: ${getThemeLabel(newTheme)}`);
    });
  }

  // Search
  elements.searchBox.addEventListener('input', () => {
    renderMessages(elements);
    attachCopyButtonListeners();
  });

  // Export modal
  elements.exportBtn.addEventListener('click', () => {
    if (state.currentSession === null) {
      toastError('Select a session first');
      return;
    }
    elements.exportModal.classList.add('active');
  });

  document.getElementById('cancelExport')?.addEventListener('click', () => {
    elements.exportModal.classList.remove('active');
  });

  document.getElementById('confirmExport')?.addEventListener('click', () => {
    const session = getCurrentSession();
    if (session) {
      exportAsMarkdown(session, getExportOptions());
      toastSuccess('Exported as Markdown');
    }
    elements.exportModal.classList.remove('active');
  });

  document.getElementById('confirmExportJson')?.addEventListener('click', () => {
    const session = getCurrentSession();
    if (session) {
      exportAsJson(session, getExportOptions());
      toastSuccess('Exported as JSON');
    }
    elements.exportModal.classList.remove('active');
  });

  elements.exportModal.addEventListener('click', (e) => {
    if (e.target === elements.exportModal) {
      elements.exportModal.classList.remove('active');
    }
  });

  // Delete modal
  elements.deleteBtn.addEventListener('click', () => {
    const session = getCurrentSession();
    if (!session) {
      toastError('Select a session first');
      return;
    }
    if (!session.path) {
      toastError('Cannot delete local file sessions');
      return;
    }
    elements.deleteSessionName.textContent = session.path;
    elements.deleteModal.classList.add('active');
  });

  document.getElementById('cancelDelete')?.addEventListener('click', () => {
    elements.deleteModal.classList.remove('active');
  });

  document.getElementById('confirmDelete')?.addEventListener('click', async () => {
    const session = getCurrentSession();
    if (!session?.path) {
      elements.deleteModal.classList.remove('active');
      return;
    }

    const result = await deleteSession(session.path);
    elements.deleteModal.classList.remove('active');

    if (result.error) {
      toastError('Delete failed: ' + result.error);
    } else {
      toastSuccess('Conversation deleted');
      // Refresh the session list
      await loadFromServer();
      if (state.sessions.length > 0) {
        await selectSession(0);
      } else {
        renderMessages(elements);
      }
    }
  });

  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) {
      elements.deleteModal.classList.remove('active');
    }
  });

  // Mobile menu
  elements.mobileMenuBtn?.addEventListener('click', () => {
    const isOpen = elements.sidebar.classList.contains('open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  elements.sidebarOverlay?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  // Drag and drop
  document.body.addEventListener('dragover', (e) => e.preventDefault());
  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
      f.name.endsWith('.jsonl')
    );
    if (files.length > 0) handleFileInput(files);
  });

  // Use MutationObserver to attach listeners when session list updates
  const observer = new MutationObserver(() => {
    attachSessionListeners();
  });
  observer.observe(elements.sessionList, { childList: true });

  // Initial load
  if (state.isServerMode) {
    const loaded = await loadFromServer();
    if (loaded && state.sessions.length > 0) {
      await selectSession(0);
    }
  }
}

// Start the application
init().catch(console.error);
