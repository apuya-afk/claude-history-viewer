/**
 * Utility functions for HTML escaping, redaction, and formatting
 */
import { state } from './state';

/** Sensitive data patterns for redaction */
const SENSITIVE_PATTERNS: RegExp[] = [
  // OpenAI/Anthropic API keys
  /\b(sk-[a-zA-Z0-9]{20,})\b/g,
  // Generic API keys
  /\b(api[_-]?key[s]?[\s:=]+['"]?)([a-zA-Z0-9_\-]{20,})(['"]?)/gi,
  // Tokens
  /\b(token[\s:=]+['"]?)([a-zA-Z0-9_\-\.]{20,})(['"]?)/gi,
  // Secrets
  /\b(secret[\s:=]+['"]?)([a-zA-Z0-9_\-]{16,})(['"]?)/gi,
  // Passwords
  /\b(password[\s:=]+['"]?)([^\s'"]{8,})(['"]?)/gi,
  // Bearer tokens
  /\b(bearer\s+)([a-zA-Z0-9_\-\.]+)/gi,
  // AWS Access Key ID
  /\b(AKIA[0-9A-Z]{16})\b/g,
  // AWS Secret Access Key
  /\b(aws[_-]?secret[_-]?access[_-]?key[\s:=]+['"]?)([a-zA-Z0-9\/+=]{40})(['"]?)/gi,
  // GitHub Personal Access Token
  /\b(ghp_[a-zA-Z0-9]{36})\b/g,
  // GitHub OAuth Token
  /\b(gho_[a-zA-Z0-9]{36})\b/g,
  // GitHub Fine-grained PAT
  /\b(github_pat_[a-zA-Z0-9_]{22,})\b/g,
  // Private keys
  /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g,
  // MongoDB connection strings
  /\b(mongodb(\+srv)?:\/\/[^\s]+)/gi,
  // PostgreSQL connection strings
  /\b(postgres(ql)?:\/\/[^\s]+)/gi,
  // MySQL connection strings
  /\b(mysql:\/\/[^\s]+)/gi,
  // Redis connection strings
  /\b(redis:\/\/[^\s]+)/gi,
  // Email addresses
  /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
  // Private IP addresses (Class A)
  /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g,
  // Private IP addresses (Class C)
  /\b(192\.168\.\d{1,3}\.\d{1,3})\b/g,
  // Private IP addresses (Class B)
  /\b(172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})\b/g,
];

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Redacts sensitive information (API keys, tokens, passwords, etc.)
 */
export function redactSensitive(text: string): string {
  if (!state.redactSecrets || !text) return text;
  let redacted = text;
  SENSITIVE_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, (match) => {
      if (match.length > 12) {
        return `${match.slice(0, 4)}<span class="redacted">REDACTED</span>${match.slice(-4)}`;
      }
      return '<span class="redacted">REDACTED</span>';
    });
  });
  return redacted;
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Strips HTML tags from text (for export)
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '[REDACTED]');
}
