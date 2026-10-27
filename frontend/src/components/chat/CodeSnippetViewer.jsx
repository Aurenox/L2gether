import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, CheckCircle2 } from 'lucide-react';

export const LANGUAGE_CONFIG = {
  javascript: { label: 'JavaScript', short: 'JS', color: '#F7DF1E', bg: 'rgba(247, 223, 30, 0.12)', border: '#F7DF1E' },
  js: { label: 'JavaScript', short: 'JS', color: '#F7DF1E', bg: 'rgba(247, 223, 30, 0.12)', border: '#F7DF1E' },
  typescript: { label: 'TypeScript', short: 'TS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38BDF8' },
  ts: { label: 'TypeScript', short: 'TS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38BDF8' },
  python: { label: 'Python', short: 'PY', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', border: '#FACC15' },
  py: { label: 'Python', short: 'PY', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', border: '#FACC15' },
  html: { label: 'HTML5', short: 'HTML', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)', border: '#FB923C' },
  css: { label: 'CSS3', short: 'CSS', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38BDF8' },
  c: { label: 'C Program', short: 'C', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.15)', border: '#818CF8' },
  cpp: { label: 'C++', short: 'C++', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)', border: '#A78BFA' },
  'c++': { label: 'C++', short: 'C++', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)', border: '#A78BFA' },
  sql: { label: 'SQL', short: 'SQL', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.15)', border: '#F472B6' },
  json: { label: 'JSON', short: '{ }', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', border: '#34D399' },
  bash: { label: 'Bash', short: 'SH', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)', border: '#C084FC' },
  sh: { label: 'Shell', short: 'SH', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)', border: '#C084FC' },
  shell: { label: 'Shell', short: 'SH', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)', border: '#C084FC' },
  rust: { label: 'Rust', short: 'RS', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', border: '#F97316' },
  java: { label: 'Java', short: 'JAVA', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444' }
};

const DEFAULT_CONFIG = {
  label: 'Code',
  short: '</>',
  color: '#A5B4FC',
  bg: 'rgba(165, 180, 252, 0.15)',
  border: '#818CF8'
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Tokenize a single line of code with rich syntax colors
 */
export function highlightCodeLine(line, lang = 'javascript') {
  if (!line) return '&nbsp;';

  const l = (lang || '').toLowerCase();

  // 1. Comments
  if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('--')) {
    return `<span class="syn-comment">${escapeHtml(line)}</span>`;
  }

  let escaped = escapeHtml(line);

  // 2. Strings: '...', "...", `...`
  escaped = escaped.replace(/(['"`])(.*?)\1/g, '<span class="syn-string">$1$2$1</span>');

  // 3. Numbers:
  escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="syn-number">$1</span>');

  // 4. Common Keywords across JS/TS/Python/C/SQL
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import',
    'export', 'from', 'class', 'default', 'case', 'switch', 'break', 'continue', 'async',
    'await', 'try', 'catch', 'throw', 'finally', 'new', 'this', 'typeof', 'instanceof',
    'def', 'elif', 'pass', 'yield', 'lambda', 'with', 'as', 'in', 'is', 'not', 'and', 'or',
    'int', 'char', 'float', 'double', 'void', 'struct', 'sizeof', 'include', 'define',
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
    'JOIN', 'LEFT', 'RIGHT', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'DROP', 'ALTER'
  ];

  const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  escaped = escaped.replace(kwPattern, '<span class="syn-keyword">$1</span>');

  // 5. Booleans & Null
  const booleans = ['true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'NULL'];
  const boolPattern = new RegExp(`\\b(${booleans.join('|')})\\b`, 'g');
  escaped = escaped.replace(boolPattern, '<span class="syn-boolean">$1</span>');

  // 6. Function calls
  escaped = escaped.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="syn-func">$1</span>');

  // 7. HTML/XML Tags if HTML/XML
  if (l === 'html' || l === 'xml') {
    escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9_-]+)(&gt;)?/g, '<span class="syn-tag">$1</span>$2');
  }

  return escaped;
}

export default function CodeSnippetViewer({ code = '', language = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  const normalizedLang = (language || 'javascript').toLowerCase();
  const langConfig = LANGUAGE_CONFIG[normalizedLang] || DEFAULT_CONFIG;

  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      prompt('Copy code:', code);
    }
  };

  return (
    <div
      className="code-snippet-card"
      style={{
        borderLeft: `3px solid ${langConfig.border}`
      }}
    >
      {/* Mac Terminal Style Header */}
      <div className="code-snippet-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Window control dots */}
          <div className="code-snippet-dots">
            <span style={{ backgroundColor: '#EF4444' }} />
            <span style={{ backgroundColor: '#F59E0B' }} />
            <span style={{ backgroundColor: '#10B981' }} />
          </div>

          {/* Language Pill */}
          <div
            className="code-lang-pill"
            style={{
              color: langConfig.color,
              backgroundColor: langConfig.bg,
              borderColor: `${langConfig.border}40`
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.02em' }}>
              {langConfig.short}
            </span>
            <span>{langConfig.label}</span>
          </div>

          <span className="code-line-count hide-on-mobile">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          title="Copy snippet to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} color="#10B981" />
              <span style={{ color: '#10B981' }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="code-snippet-body">
        {/* Line Numbers Column */}
        <div className="code-line-numbers" aria-hidden="true">
          {lines.map((_, i) => (
            <div key={i} className="code-line-num">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Highlighted Code Content */}
        <pre className="code-snippet-pre">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="code-snippet-line"
              dangerouslySetInnerHTML={{
                __html: highlightCodeLine(line, normalizedLang)
              }}
            />
          ))}
        </pre>
      </div>
    </div>
  );
}
