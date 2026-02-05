/**
 * DOM rendering functions
 */
import type { Message, ContentBlock, DOMElements } from './types';
import { state, getCurrentSession } from './state';
import { escapeHtml, redactSensitive } from './utils';
import { icon } from './icons';
import { highlight, detectLanguage } from './highlight';

/** Generate unique ID for code blocks */
let codeBlockId = 0;
function getCodeBlockId(): string {
  return `code-${++codeBlockId}`;
}

/**
 * Format content with syntax highlighting and copy buttons
 */
function formatContentWithHighlight(text: string): string {
  if (!text) return '';

  // Collect all code (blocks and inline) BEFORE escaping
  const replacements: Array<{ placeholder: string; html: string }> = [];

  // Process code blocks first
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const blockId = getCodeBlockId();
    const language = lang || detectLanguage(code) || '';
    const highlighted = highlight(code.trim(), language);
    const langLabel = language || 'code';
    const placeholder = `\x00BLOCK${replacements.length}\x00`;

    replacements.push({
      placeholder,
      html: `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-block-lang">${langLabel}</span>
            <button class="copy-btn" data-code-id="${blockId}" type="button" aria-label="Copy code">
              ${icon('copy')}
              <span>Copy</span>
            </button>
          </div>
          <pre id="${blockId}"><code>${highlighted}</code></pre>
        </div>
      `,
    });

    return placeholder;
  });

  // Process inline code
  processed = processed.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `\x00INLINE${replacements.length}\x00`;
    replacements.push({
      placeholder,
      html: `<code>${escapeHtml(code)}</code>`,
    });
    return placeholder;
  });

  // Now escape the remaining text (non-code parts)
  processed = escapeHtml(processed);
  processed = redactSensitive(processed);

  // Restore all code
  for (const { placeholder, html } of replacements) {
    processed = processed.replace(placeholder, html);
  }

  return processed;
}

/**
 * Renders the session list in the sidebar
 */
export function renderSessionList(elements: DOMElements): void {
  if (state.sessions.length === 0) {
    elements.sessionList.innerHTML = `
      <div class="empty-state">
        <p>No sessions found</p>
      </div>
    `;
    return;
  }

  elements.sessionList.innerHTML = state.sessions
    .map((session, idx) => {
      let preview: string;
      let date: string;
      let msgCount: number;

      if (session.sessionInfo?.preview) {
        preview = session.sessionInfo.preview.slice(0, 50);
        date = session.sessionInfo.timestamp
          ? new Date(session.sessionInfo.timestamp).toLocaleString()
          : 'Unknown';
        msgCount = session.sessionInfo.messageCount ?? session.messages.length;
      } else {
        const firstMsg = session.messages.find((m) => m.type === 'user');
        const content = firstMsg?.message?.content;
        preview =
          typeof content === 'string' ? content.slice(0, 50) : 'Empty';
        date = session.messages[0]?.timestamp
          ? new Date(session.messages[0].timestamp).toLocaleString()
          : 'Unknown';
        msgCount = session.messages.length;
      }

      return `
        <div class="session-item ${idx === state.currentSession ? 'active' : ''}"
             data-idx="${idx}"
             tabindex="0"
             role="button"
             aria-pressed="${idx === state.currentSession}">
          <div class="session-date">${escapeHtml(date)}</div>
          <div class="session-preview">${escapeHtml(preview)}...</div>
          <div class="session-meta">
            <span class="session-meta-badge">${msgCount} msgs</span>
            <span class="session-meta-path">${escapeHtml(session.sessionInfo?.cwd ?? session.filename)}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Renders a single message bubble
 */
export function renderMessage(msg: Message): string {
  const role = msg.type;
  const timestamp = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString()
    : '';
  const content = msg.message?.content;

  let contentHtml = '';

  if (typeof content === 'string') {
    contentHtml = formatContentWithHighlight(content);
  } else if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if (block.type === 'text') {
        contentHtml += formatContentWithHighlight(block.text);
      } else if (block.type === 'thinking' && state.showThinking) {
        contentHtml += `
          <details class="thinking-block">
            <summary>${icon('brain')} Thinking</summary>
            <div>${formatContentWithHighlight(block.thinking)}</div>
          </details>
        `;
      } else if (block.type === 'tool_use' && state.showTools) {
        const blockId = getCodeBlockId();
        const jsonCode = JSON.stringify(block.input, null, 2);
        contentHtml += `
          <div class="tool-block">
            <div class="tool-header">${icon('wrench')} ${escapeHtml(block.name)}</div>
            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span class="code-block-lang">json</span>
                <button class="copy-btn" data-code-id="${blockId}" type="button" aria-label="Copy code">
                  ${icon('copy')}
                  <span>Copy</span>
                </button>
              </div>
              <pre id="${blockId}"><code>${highlight(jsonCode, 'json')}</code></pre>
            </div>
          </div>
        `;
      } else if (block.type === 'tool_result' && state.showTools) {
        const resultContent =
          typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content, null, 2);
        contentHtml += `
          <div class="tool-block tool-result">
            <div class="tool-header">${icon('upload')} Tool Result</div>
            <pre>${formatContentWithHighlight(resultContent)}</pre>
          </div>
        `;
      }
    }
  }

  if (!contentHtml.trim()) return '';

  return `
    <article class="message ${role}" role="article" aria-label="${role} message">
      <header class="message-header">
        <span class="message-role">${role}</span>
        <time class="message-time">${timestamp}</time>
      </header>
      <div class="message-content">${contentHtml}</div>
    </article>
  `;
}

/**
 * Renders all messages for the current session
 */
export function renderMessages(elements: DOMElements): void {
  const session = getCurrentSession();

  if (!session) {
    elements.messagesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('scroll')}</div>
        <h2>Select a Session</h2>
        <p>Choose a conversation from the sidebar</p>
      </div>
    `;
    elements.statsBar.style.display = 'none';
    return;
  }

  const searchTerm = elements.searchBox.value.toLowerCase();

  const filteredMessages = session.messages.filter((msg) => {
    if (!searchTerm) return true;
    const content = msg.message?.content;
    const textContent =
      typeof content === 'string'
        ? content
        : (content as ContentBlock[] | undefined)
            ?.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            .map((c) => c.text)
            .join('') ?? '';
    return textContent.toLowerCase().includes(searchTerm);
  });

  // Calculate stats
  let totalTokens = 0;
  const timestamps: Date[] = [];

  for (const msg of filteredMessages) {
    if (msg.message?.usage) {
      totalTokens +=
        (msg.message.usage.input_tokens ?? 0) +
        (msg.message.usage.output_tokens ?? 0);
    }
    if (msg.timestamp) {
      timestamps.push(new Date(msg.timestamp));
    }
  }

  // Reset code block ID counter for consistent IDs
  codeBlockId = 0;

  const html = filteredMessages.map(renderMessage).join('');

  elements.messagesContainer.innerHTML =
    html ||
    `
    <div class="empty-state">
      <p>No messages match your search</p>
    </div>
  `;

  // Update stats
  elements.statsBar.style.display = 'flex';
  elements.messageCount.textContent = String(session.messages.length);
  elements.tokenCount.textContent = totalTokens.toLocaleString();

  if (timestamps.length >= 2) {
    const firstTs = timestamps[0];
    const lastTs = timestamps[timestamps.length - 1];
    const durationMs = lastTs.getTime() - firstTs.getTime();
    elements.sessionDuration.textContent = `${Math.round(durationMs / 1000 / 60)} min`;
  } else {
    elements.sessionDuration.textContent = '—';
  }
}

/**
 * Shows loading state with skeleton loaders
 */
export function showLoading(elements: DOMElements): void {
  elements.messagesContainer.innerHTML = `
    <div class="skeleton-message">
      <div class="skeleton-message-header">
        <div class="skeleton skeleton-message-role"></div>
        <div class="skeleton skeleton-message-time"></div>
      </div>
      <div class="skeleton-message-content">
        <div class="skeleton skeleton-message-line"></div>
        <div class="skeleton skeleton-message-line"></div>
        <div class="skeleton skeleton-message-line"></div>
      </div>
    </div>
    <div class="skeleton-message" style="max-width: 70%; margin-left: auto;">
      <div class="skeleton-message-header">
        <div class="skeleton skeleton-message-role"></div>
        <div class="skeleton skeleton-message-time"></div>
      </div>
      <div class="skeleton-message-content">
        <div class="skeleton skeleton-message-line"></div>
        <div class="skeleton skeleton-message-line"></div>
      </div>
    </div>
    <div class="skeleton-message">
      <div class="skeleton-message-header">
        <div class="skeleton skeleton-message-role"></div>
        <div class="skeleton skeleton-message-time"></div>
      </div>
      <div class="skeleton-message-content">
        <div class="skeleton skeleton-message-line"></div>
        <div class="skeleton skeleton-message-line"></div>
        <div class="skeleton skeleton-message-line"></div>
      </div>
    </div>
  `;
}

/**
 * Shows skeleton loaders for session list
 */
export function showSessionListLoading(elements: DOMElements): void {
  elements.sessionList.innerHTML = Array(5)
    .fill(0)
    .map(
      () => `
      <div class="skeleton-session">
        <div class="skeleton skeleton-session-date"></div>
        <div class="skeleton skeleton-session-preview"></div>
        <div class="skeleton skeleton-session-meta"></div>
      </div>
    `
    )
    .join('');
}
