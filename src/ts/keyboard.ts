/**
 * Keyboard shortcuts system
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

const shortcuts: KeyboardShortcut[] = [];
let helpModal: HTMLElement | null = null;

/** Register a keyboard shortcut */
export function registerShortcut(shortcut: KeyboardShortcut): void {
  shortcuts.push(shortcut);
}

/** Check if an element is an input field */
function isInputField(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tagName = el.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    el.isContentEditable
  );
}

/** Format shortcut for display */
function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl || shortcut.meta) parts.push('⌘');
  if (shortcut.alt) parts.push('⌥');
  if (shortcut.shift) parts.push('⇧');

  // Format special keys
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowUp') key = '↑';
  if (key === 'ArrowDown') key = '↓';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  if (key === 'Escape') key = 'Esc';

  parts.push(key.toUpperCase());
  return parts.join('');
}

/** Create and show help modal */
export function showKeyboardHelp(): void {
  if (helpModal) {
    helpModal.classList.add('active');
    return;
  }

  helpModal = document.createElement('div');
  helpModal.className = 'modal-overlay keyboard-help-modal';
  helpModal.innerHTML = `
    <div class="modal">
      <h2>Keyboard Shortcuts</h2>
      <div class="keyboard-shortcuts-list">
        ${shortcuts
          .map(
            (s) => `
          <div class="keyboard-shortcut-item">
            <kbd>${formatShortcut(s)}</kbd>
            <span>${s.description}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="modal-actions">
        <button class="btn" type="button">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(helpModal);

  // Trigger animation
  helpModal.offsetHeight;
  helpModal.classList.add('active');

  const close = () => {
    helpModal?.classList.remove('active');
  };

  helpModal.querySelector('.btn')?.addEventListener('click', close);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) close();
  });
}

/** Initialize keyboard shortcut handler */
export function initKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (isInputField(e.target)) {
      // But allow Escape to blur
      if (e.key === 'Escape' && e.target instanceof HTMLElement) {
        e.target.blur();
      }
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = (shortcut.ctrl ?? false) === (e.ctrlKey || e.metaKey);
      const altMatch = (shortcut.alt ?? false) === e.altKey;
      const shiftMatch = (shortcut.shift ?? false) === e.shiftKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  });
}
