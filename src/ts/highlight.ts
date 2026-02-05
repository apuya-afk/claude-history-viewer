/**
 * Lightweight syntax highlighting for code blocks
 * Supports common languages without external dependencies
 */

interface LanguageRules {
  keywords?: string[];
  types?: string[];
  builtins?: string[];
  strings?: RegExp;
  comments?: RegExp;
  numbers?: RegExp;
  operators?: RegExp;
  functions?: RegExp;
}

const languages: Record<string, LanguageRules> = {
  javascript: {
    keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'class', 'extends', 'new', 'this', 'super', 'import', 'export', 'from', 'default', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'yield'],
    types: ['null', 'undefined', 'true', 'false', 'NaN', 'Infinity'],
    builtins: ['console', 'window', 'document', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set'],
    strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi,
    operators: /([+\-*/%=<>!&|^~?:]+)/g,
    functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
  },
  typescript: {
    keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'class', 'extends', 'new', 'this', 'super', 'import', 'export', 'from', 'default', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'yield', 'type', 'interface', 'enum', 'namespace', 'module', 'declare', 'abstract', 'implements', 'private', 'public', 'protected', 'readonly', 'static', 'as', 'is', 'keyof', 'infer'],
    types: ['null', 'undefined', 'true', 'false', 'NaN', 'Infinity', 'string', 'number', 'boolean', 'any', 'unknown', 'never', 'void', 'object'],
    builtins: ['console', 'window', 'document', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set', 'Record', 'Partial', 'Required', 'Pick', 'Omit'],
    strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi,
    operators: /([+\-*/%=<>!&|^~?:]+)/g,
    functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
  },
  python: {
    keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise', 'pass', 'break', 'continue', 'lambda', 'and', 'or', 'not', 'in', 'is', 'global', 'nonlocal', 'assert', 'del', 'async', 'await'],
    types: ['None', 'True', 'False'],
    builtins: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'open', 'input', 'map', 'filter', 'zip', 'enumerate', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'round'],
    strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    comments: /(#.*$)/gm,
    numbers: /\b(\d+\.?\d*(?:e[+-]?\d+)?j?)\b/gi,
    operators: /([+\-*/%=<>!&|^~@:]+)/g,
    functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
  },
  bash: {
    keywords: ['if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'until', 'case', 'esac', 'function', 'return', 'in', 'select'],
    builtins: ['echo', 'cd', 'pwd', 'ls', 'cat', 'grep', 'sed', 'awk', 'find', 'xargs', 'sort', 'uniq', 'wc', 'head', 'tail', 'cut', 'tr', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'export', 'source', 'alias', 'exit'],
    strings: /("(?:[^"\\]|\\.)*"|'[^']*')/g,
    comments: /(#.*$)/gm,
    numbers: /\b(\d+)\b/g,
    operators: /([|&;<>=!]+)/g,
  },
  json: {
    strings: /("(?:[^"\\]|\\.)*")\s*(?=:)/g, // Keys
    types: ['true', 'false', 'null'],
    numbers: /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi,
  },
  css: {
    keywords: ['@import', '@media', '@keyframes', '@font-face', '@supports', '@charset'],
    builtins: ['inherit', 'initial', 'unset', 'none', 'auto', 'block', 'inline', 'flex', 'grid', 'absolute', 'relative', 'fixed', 'sticky'],
    strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    comments: /(\/\*[\s\S]*?\*\/)/g,
    numbers: /\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?)\b/gi,
  },
  html: {
    strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    comments: /(<!--[\s\S]*?-->)/g,
  },
};

// Aliases
languages.js = languages.javascript;
languages.ts = languages.typescript;
languages.py = languages.python;
languages.sh = languages.bash;
languages.shell = languages.bash;
languages.zsh = languages.bash;

/** Escape HTML entities */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Apply highlighting to code */
export function highlight(code: string, language?: string): string {
  const lang = language?.toLowerCase();
  const rules = lang ? languages[lang] : null;

  // Escape HTML first
  let result = escapeHtml(code);

  if (!rules) {
    return result;
  }

  // Store replaced segments to avoid double-processing
  const placeholders: string[] = [];
  const placeholder = (content: string, className: string) => {
    const idx = placeholders.length;
    placeholders.push(`<span class="hl-${className}">${content}</span>`);
    return `\x00${idx}\x00`;
  };

  // Apply rules in order (comments and strings first to protect them)
  if (rules.comments) {
    result = result.replace(rules.comments, (m) => placeholder(m, 'comment'));
  }

  if (rules.strings) {
    result = result.replace(rules.strings, (m) => placeholder(m, 'string'));
  }

  if (rules.numbers) {
    result = result.replace(rules.numbers, (m) => placeholder(m, 'number'));
  }

  if (rules.functions) {
    result = result.replace(rules.functions, (m) => placeholder(m, 'function'));
  }

  if (rules.keywords) {
    const kwRegex = new RegExp(`\\b(${rules.keywords.join('|')})\\b`, 'g');
    result = result.replace(kwRegex, (m) => placeholder(m, 'keyword'));
  }

  if (rules.types) {
    const typeRegex = new RegExp(`\\b(${rules.types.join('|')})\\b`, 'g');
    result = result.replace(typeRegex, (m) => placeholder(m, 'type'));
  }

  if (rules.builtins) {
    const builtinRegex = new RegExp(`\\b(${rules.builtins.join('|')})\\b`, 'g');
    result = result.replace(builtinRegex, (m) => placeholder(m, 'builtin'));
  }

  // Restore placeholders
  result = result.replace(/\x00(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx, 10)]);

  return result;
}

/** Detect language from code content */
export function detectLanguage(code: string): string | undefined {
  // Simple heuristics
  if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'bash';
  if (code.includes('#!/usr/bin/env python')) return 'python';
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('function ') || code.includes('=>')) return 'javascript';
  if (code.includes('interface ') || code.includes(': string')) return 'typescript';
  if (code.startsWith('{') && code.endsWith('}')) return 'json';
  if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
  return undefined;
}
