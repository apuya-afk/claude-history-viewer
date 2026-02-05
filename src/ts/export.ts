/**
 * Export functions for Markdown and JSON
 */
import type { Session, ContentBlock, ExportOptions } from './types';
import { downloadFile, redactSensitive, stripHtml } from './utils';
import { state } from './state';

/**
 * Get export options from modal checkboxes
 */
export function getExportOptions(): ExportOptions {
  return {
    includeThinking: (document.getElementById('exportIncludeThinking') as HTMLInputElement)?.checked ?? false,
    includeTools: (document.getElementById('exportIncludeTools') as HTMLInputElement)?.checked ?? false,
    redact: (document.getElementById('exportRedact') as HTMLInputElement)?.checked ?? true,
    includeMetadata: (document.getElementById('exportMetadata') as HTMLInputElement)?.checked ?? false,
  };
}

/**
 * Apply redaction to text if enabled
 */
function maybeRedact(text: string, shouldRedact: boolean): string {
  if (!shouldRedact) return text;
  // Temporarily enable redaction for this operation
  const wasEnabled = state.redactSecrets;
  state.redactSecrets = true;
  const result = stripHtml(redactSensitive(text));
  state.redactSecrets = wasEnabled;
  return result;
}

/**
 * Export session as Markdown
 */
export function exportAsMarkdown(session: Session, options: ExportOptions): void {
  let md = `# Claude Code Conversation\n\n`;
  md += `**Session:** ${session.sessionInfo?.id ?? 'Unknown'}\n`;
  md += `**Directory:** ${session.sessionInfo?.cwd ?? 'Unknown'}\n\n---\n\n`;

  for (const msg of session.messages) {
    const role = msg.type.toUpperCase();
    const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
    md += `## ${role}${options.includeMetadata ? ` (${ts})` : ''}\n\n`;

    const content = msg.message?.content;
    if (typeof content === 'string') {
      md += maybeRedact(content, options.redact) + '\n\n';
    } else if (Array.isArray(content)) {
      for (const block of content as ContentBlock[]) {
        if (block.type === 'text') {
          md += maybeRedact(block.text, options.redact) + '\n\n';
        } else if (block.type === 'thinking' && options.includeThinking) {
          md += `<details><summary>Thinking</summary>\n\n${block.thinking}\n\n</details>\n\n`;
        } else if (block.type === 'tool_use' && options.includeTools) {
          md += `**Tool: ${block.name}**\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }
    md += `---\n\n`;
  }

  downloadFile(md, `claude-${Date.now()}.md`, 'text/markdown');
}

/**
 * Export session as JSON
 */
export function exportAsJson(session: Session, options: ExportOptions): void {
  // Deep clone to avoid modifying original
  const exportData = JSON.parse(JSON.stringify(session)) as Session;

  if (options.redact) {
    exportData.messages = exportData.messages.map((msg) => {
      const content = msg.message?.content;
      if (typeof content === 'string') {
        msg.message!.content = maybeRedact(content, true);
      } else if (Array.isArray(content) && msg.message) {
        msg.message.content = (content as ContentBlock[]).map((block) => {
          if (block.type === 'text') {
            return { ...block, text: maybeRedact(block.text, true) };
          }
          if (block.type === 'thinking') {
            return { ...block, thinking: maybeRedact(block.thinking, true) };
          }
          return block;
        });
      }
      return msg;
    });
  }

  downloadFile(
    JSON.stringify(exportData, null, 2),
    `claude-${Date.now()}.json`,
    'application/json'
  );
}
