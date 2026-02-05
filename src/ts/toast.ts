/**
 * Toast notification system
 */
import { icon } from './icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return icon('check');
    case 'error':
      return icon('x');
    case 'warning':
      return icon('alertTriangle');
    case 'info':
    default:
      return icon('info');
  }
}

/**
 * Show a toast notification
 */
export function toast(message: string, options: ToastOptions = {}): () => void {
  const { type = 'info', duration = 4000, action } = options;
  const container = getContainer();

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.innerHTML = `
    <span class="toast-icon">${getIcon(type)}</span>
    <span class="toast-message">${message}</span>
    ${action ? `<button class="toast-action" type="button">${action.label}</button>` : ''}
    <button class="toast-close" type="button" aria-label="Dismiss">${icon('x')}</button>
  `;

  // Add to container with animation
  container.appendChild(toastEl);

  // Trigger reflow for animation
  toastEl.offsetHeight;
  toastEl.classList.add('toast-visible');

  const dismiss = () => {
    toastEl.classList.remove('toast-visible');
    toastEl.classList.add('toast-hiding');
    toastEl.addEventListener('animationend', () => {
      toastEl.remove();
    }, { once: true });
  };

  // Event listeners
  toastEl.querySelector('.toast-close')?.addEventListener('click', dismiss);

  if (action) {
    toastEl.querySelector('.toast-action')?.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
  }

  // Auto dismiss
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
}

// Convenience methods
export const toastSuccess = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'success' });

export const toastError = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'error', duration: options?.duration ?? 6000 });

export const toastWarning = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'warning' });

export const toastInfo = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'info' });
