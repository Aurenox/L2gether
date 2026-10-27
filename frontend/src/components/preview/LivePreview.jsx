import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowLeft,
  ArrowRight,
  FileCode,
  X
} from 'lucide-react';
import SectionHelpButton from '../common/SectionHelpButton.jsx';

export default function LivePreview({ files = [], activeFilePath = '', onSelectFile, isSplit = false, onCloseSplit }) {
  const [viewport, setViewport] = useState('desktop'); // desktop, tablet, mobile
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const iframeRef = useRef(null);

  // All HTML files in workspace
  const htmlFiles = files.filter((f) => f.path && f.path.toLowerCase().endsWith('.html'));

  // Helper to resolve an HTML file from path, relative link or clean filename
  const resolveHtmlFile = (target) => {
    if (!target || htmlFiles.length === 0) return null;
    const clean = target.split('?')[0].split('#')[0].replace(/^\.?\/+/, '').toLowerCase();
    return htmlFiles.find((f) => {
      const p = f.path.replace(/^\.?\/+/, '').toLowerCase();
      return (
        p === clean ||
        p === clean + '.html' ||
        p.endsWith('/' + clean) ||
        p.endsWith('/' + clean + '.html')
      );
    });
  };

  // State to track currently viewed preview HTML page
  const [currentPagePath, setCurrentPagePath] = useState('');
  const [navHistory, setNavHistory] = useState([]);
  const [navIndex, setNavIndex] = useState(-1);

  // Synchronize when the user selects or edits an HTML file in the editor
  useEffect(() => {
    if (activeFilePath && activeFilePath.toLowerCase().endsWith('.html')) {
      const match = resolveHtmlFile(activeFilePath);
      if (match) {
        setCurrentPagePath(match.path);
        setNavHistory((prev) => {
          if (prev[prev.length - 1] === match.path) return prev;
          return [...prev, match.path];
        });
        setNavIndex((prev) => prev + 1);
      }
    }
  }, [activeFilePath]);

  // Determine active HTML file to render
  const activeHtmlDoc = (() => {
    // 1. User navigated or selected a page in preview
    if (currentPagePath) {
      const found = resolveHtmlFile(currentPagePath);
      if (found) return found;
    }
    // 2. Active file in editor is an HTML file
    if (activeFilePath && activeFilePath.toLowerCase().endsWith('.html')) {
      const found = resolveHtmlFile(activeFilePath);
      if (found) return found;
    }
    // 3. Fallback priority: index.html
    const indexDoc = htmlFiles.find(
      (f) => f.path === 'index.html' || f.path.toLowerCase().endsWith('/index.html')
    );
    if (indexDoc) return indexDoc;

    // 4. Otherwise first available HTML file
    return htmlFiles[0] || null;
  })();

  // Keep currentPagePath and initial history synced
  useEffect(() => {
    if (!currentPagePath && activeHtmlDoc) {
      setCurrentPagePath(activeHtmlDoc.path);
      setNavHistory([activeHtmlDoc.path]);
      setNavIndex(0);
    }
  }, [activeHtmlDoc, currentPagePath]);

  // Programmatic and link navigation handler
  const navigateToPage = (targetPath, pushHistory = true) => {
    if (!targetPath) return;
    const match = resolveHtmlFile(targetPath);
    if (match) {
      setCurrentPagePath(match.path);
      if (pushHistory) {
        setNavHistory((prev) => {
          const next = prev.slice(0, navIndex + 1);
          return [...next, match.path];
        });
        setNavIndex((prev) => prev + 1);
      }
      if (onSelectFile) {
        onSelectFile(match.path, false);
      }
      setRefreshKey((k) => k + 1);
    } else {
      console.warn('[LivePreview] Page not found in workspace:', targetPath);
      setLogs((prev) => [
        ...prev.slice(-100),
        {
          level: 'warn',
          message: `Cannot navigate to "${targetPath}": page not found in workspace files.`,
          time: new Date().toLocaleTimeString()
        }
      ]);
    }
  };

  // Back / Forward Browser History
  const handleGoBack = () => {
    if (navIndex > 0) {
      const prevPage = navHistory[navIndex - 1];
      setNavIndex((i) => i - 1);
      setCurrentPagePath(prevPage);
      if (onSelectFile) onSelectFile(prevPage, false);
      setRefreshKey((k) => k + 1);
    }
  };

  const handleGoForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextPage = navHistory[navIndex + 1];
      setNavIndex((i) => i + 1);
      setCurrentPagePath(nextPage);
      if (onSelectFile) onSelectFile(nextPage, false);
      setRefreshKey((k) => k + 1);
    }
  };

  // Detect preview mode for active document (single-file all-in-one vs linked separate files)
  const hasInlineStyles = activeHtmlDoc && /<style\b[^>]*>/i.test(activeHtmlDoc.content || '');
  const hasLinkedCss = activeHtmlDoc && /<link\b[^>]*rel=["']stylesheet["']/i.test(activeHtmlDoc.content || '');
  const previewModeText = (hasInlineStyles && !hasLinkedCss)
    ? 'Single-File (All-in-One)'
    : hasLinkedCss
      ? 'Separate Files Linked'
      : 'Standard HTML';

  // Compiles an HTML document with asset inlining, normalization, and navigation bridge
  const compileDocument = (targetDoc, isStandalone = false) => {
    let rawHtml = targetDoc ? (targetDoc.content || '') : '';

    if (!rawHtml.trim()) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0B0D12;
      color: #F4F6FB;
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
      box-sizing: border-box;
    }
    .empty-card {
      background: #161B26;
      border: 1px solid #293142;
      border-radius: 14px;
      padding: 2.5rem 2rem;
      max-width: 480px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h2 { font-size: 1.35rem; margin-bottom: 0.5rem; color: #7C6CFF; }
    p { color: #A2A9B8; font-size: 0.95rem; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <div class="empty-card">
    <h2>No HTML content</h2>
    <p>Select or create an HTML file in the editor to see live preview.</p>
  </div>
</body>
</html>`;
    }

    let html = rawHtml;

    // Ensure basic HTML skeleton exists if user only wrote a snippet
    const hasHtmlTag = /<html[\s>]/i.test(html);
    const hasBodyTag = /<body[\s>]/i.test(html);
    if (!hasHtmlTag && !hasBodyTag) {
      html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${targetDoc?.path || 'Live Preview'}</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
    }

    // Ensure responsive meta tag is present so mobile/tablet viewports render correctly
    if (!/<meta\s+name=["']viewport["']/i.test(html)) {
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
      } else if (html.includes('</head>')) {
        html = html.replace('</head>', '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>');
      }
    }

    // Check whether user has inline styles or scripts in this file
    const fileHasInlineStyles = /<style\b[^>]*>[\s\S]*?<\/style>/i.test(html);
    const fileHasInlineScripts = /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(html);

    // Step 1: In-place resolution of <link rel="stylesheet"> tags
    const linkedCssPaths = new Set();
    html = html.replace(/<link\b([^>]*?)>/gi, (match, attrs) => {
      const isStylesheet = /\brel=["']stylesheet["']/i.test(attrs);
      if (!isStylesheet) return match;

      const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
      if (!hrefMatch) return match;

      const href = hrefMatch[1].trim();
      // Keep external stylesheets (Google Fonts, CDN, data:) intact
      if (/^(?:https?:|\/\/|data:)/i.test(href)) {
        return match;
      }

      const cleanHref = href.replace(/^\.?\/+/, '');
      const matchedFile = files.find((f) =>
        f.path === href ||
        f.path === cleanHref ||
        f.path.toLowerCase() === cleanHref.toLowerCase() ||
        f.path.endsWith('/' + cleanHref)
      );

      if (matchedFile) {
        linkedCssPaths.add(matchedFile.path);
        return `<style data-source="${matchedFile.path}">\n/* Inlined from ${matchedFile.path} */\n${matchedFile.content}\n</style>`;
      }

      // If missing locally, remove to avoid 404 iframe errors
      return `<!-- Missing stylesheet: ${href} -->`;
    });

    // Step 2: In-place resolution of <script src="..."> tags
    const linkedJsPaths = new Set();
    html = html.replace(/<script\b([^>]*?)(?:\s*\/>|>(.*?)<\/script>)/gis, (match, attrs) => {
      const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcMatch) {
        return match; // Inline script without src
      }

      const src = srcMatch[1].trim();
      if (/^(?:https?:|\/\/|data:)/i.test(src)) {
        return match; // External script CDN
      }

      const cleanSrc = src.replace(/^\.?\/+/, '');
      const matchedFile = files.find((f) =>
        f.path === src ||
        f.path === cleanSrc ||
        f.path.toLowerCase() === cleanSrc.toLowerCase() ||
        f.path.endsWith('/' + cleanSrc)
      );

      if (matchedFile) {
        linkedJsPaths.add(matchedFile.path);
        const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
        const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : '';
        return `<script${typeAttr} data-source="${matchedFile.path}">\n/* Inlined from ${matchedFile.path} */\n${matchedFile.content}\n</script>`;
      }

      return `<!-- Missing script: ${src} -->`;
    });

    // Step 3: Handle unlinked workspace CSS & JS files
    // If file has inline <style> tags or already linked CSS, NEVER inject unlinked CSS!
    let extraStyles = '';
    if (!fileHasInlineStyles && linkedCssPaths.size === 0) {
      const unlinkedCss = files.filter((f) => f.path.endsWith('.css') && !linkedCssPaths.has(f.path));
      if (unlinkedCss.length > 0) {
        extraStyles = unlinkedCss.map((c) => `<style data-unlinked="${c.path}">/* ${c.path} */\n${c.content}</style>`).join('\n');
      }
    }

    let extraScripts = '';
    if (!fileHasInlineScripts && linkedJsPaths.size === 0) {
      const unlinkedJs = files.filter((f) => f.path.endsWith('.js') && !f.path.includes('test') && !linkedJsPaths.has(f.path));
      if (unlinkedJs.length > 0) {
        extraScripts = unlinkedJs.map((s) => `<script data-unlinked="${s.path}">/* ${s.path} */\n${s.content}</script>`).join('\n');
      }
    }

    // Step 3.5: In-place resolution of local images, videos, audio, and CSS url() assets
    const resolveAssetUrl = (assetPath) => {
      if (!assetPath || /^(?:https?:|\/\/|data:|blob:|#|mailto:|tel:)/i.test(assetPath)) return null;
      const cleanAsset = assetPath.split('?')[0].split('#')[0].replace(/^\.?\/+/, '');
      const docPath = targetDoc?.path || '';

      // Direct match or filename match
      let matched = files.find(
        (f) =>
          f.path === cleanAsset ||
          f.path.toLowerCase() === cleanAsset.toLowerCase() ||
          f.path === assetPath ||
          f.path.endsWith('/' + cleanAsset)
      );

      // Relative to current document folder
      if (!matched && docPath.includes('/')) {
        const docDir = docPath.slice(0, docPath.lastIndexOf('/'));
        const relativeCandidate = `${docDir}/${cleanAsset}`;
        matched = files.find(
          (f) =>
            f.path === relativeCandidate ||
            f.path.toLowerCase() === relativeCandidate.toLowerCase()
        );
      }

      if (matched && matched.content) {
        if (matched.content.startsWith('data:')) {
          return matched.content;
        }
        if (matched.path.toLowerCase().endsWith('.svg')) {
          return `data:image/svg+xml;utf8,${encodeURIComponent(matched.content)}`;
        }
        return matched.content;
      }
      return null;
    };

    // Replace <img src="...">, <source src="...">, <video poster="...">, etc.
    html = html.replace(/\b(src|poster|href)=["']([^"']+)["']/gi, (match, attrName, urlVal) => {
      if (attrName.toLowerCase() === 'href' && !/\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|mp3|wav|ogg|mp4|webm)$/i.test(urlVal)) {
        return match;
      }
      const dataUri = resolveAssetUrl(urlVal);
      if (dataUri) {
        return `${attrName}="${dataUri}"`;
      }
      return match;
    });

    // Replace CSS url(...) inside html and inlined styles
    html = html.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, urlVal) => {
      const dataUri = resolveAssetUrl(urlVal);
      if (dataUri) {
        return `url("${dataUri}")`;
      }
      return match;
    });

    // Step 4: Modern Zero-Specificity Base Normalization (:where resets)
    const baseNormalizeStyle = `
      <style data-system="l2gether-base-normalize">
        :where(html) {
          box-sizing: border-box;
          -webkit-text-size-adjust: 100%;
          tab-size: 4;
        }
        :where(*, *::before, *::after) {
          box-sizing: inherit;
        }
        :where(body) {
          margin: 0;
          padding: 1.25rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background-color: #ffffff;
          word-wrap: break-word;
        }
        :where(h1, h2, h3, h4, h5, h6) {
          line-height: 1.25;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        :where(h1:first-child, h2:first-child, h3:first-child) {
          margin-top: 0;
        }
        :where(p) {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        :where(img, svg, video, canvas, audio, iframe, embed, object) {
          display: block;
          max-width: 100%;
          height: auto;
        }
        :where(input, button, textarea, select) {
          font: inherit;
        }
        :where(button) {
          cursor: pointer;
        }
        :where(table) {
          border-collapse: collapse;
          width: 100%;
        }
        :where(code, pre, kbd, samp) {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
        }
        :where(pre) {
          padding: 1rem;
          background-color: #f4f6fb;
          border-radius: 6px;
          overflow-x: auto;
        }
      </style>
    `;

    // Step 5: Console & Error Capture script
    const consoleCaptureScript = `
      <script data-system="l2gether-console-capture">
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;

          function sendLog(type, args) {
            try {
              const formatted = Array.from(args).map(a => {
                if (a === null) return 'null';
                if (a === undefined) return 'undefined';
                if (typeof a === 'object') {
                  try { return JSON.stringify(a); } catch(e) { return String(a); }
                }
                return String(a);
              }).join(' ');
              window.parent.postMessage({ type: 'L2GETHER_PREVIEW_LOG', level: type, message: formatted }, '*');
            } catch(e) {}
          }

          console.log = function(...args) { originalLog.apply(console, args); sendLog('log', args); };
          console.error = function(...args) { originalError.apply(console, args); sendLog('error', args); };
          console.warn = function(...args) { originalWarn.apply(console, args); sendLog('warn', args); };

          window.addEventListener('error', function(e) {
            sendLog('error', [e.message + (e.lineno ? ' (Line ' + e.lineno + ')' : '')]);
          });
          window.addEventListener('unhandledrejection', function(e) {
            sendLog('error', ['Unhandled Rejection: ' + (e.reason?.message || e.reason || 'Unknown error')]);
          });
        })();
      </script>
    `;

    // Step 6: Navigation bridge script (Intercepts relative links and form submissions)
    const navigationBridgeScript = `
      <script data-system="l2gether-navigation-bridge">
        (function() {
          document.addEventListener('click', function(e) {
            const anchor = e.target.closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href) return;

            // Anchor within same page (#section)
            if (href.startsWith('#')) return;

            // External protocols
            if (/^(?:https?:|\\/\\/|mailto:|tel:|javascript:|blob:|data:)/i.test(href)) {
              anchor.setAttribute('target', '_blank');
              return;
            }

            // Relative link to a workspace page
            e.preventDefault();
            e.stopPropagation();

            window.parent.postMessage({
              type: 'L2GETHER_PREVIEW_NAVIGATE',
              target: href
            }, '*');
          }, true);

          document.addEventListener('submit', function(e) {
            const form = e.target;
            const action = form.getAttribute('action');
            if (!action || /^(?:https?:|\\/\\/|javascript:)/i.test(action)) return;

            e.preventDefault();
            e.stopPropagation();

            const formData = new FormData(form);
            const params = new URLSearchParams(formData).toString();
            const targetUrl = params ? (action + '?' + params) : action;

            window.parent.postMessage({
              type: 'L2GETHER_PREVIEW_NAVIGATE',
              target: targetUrl
            }, '*');
          }, true);
        })();
      </script>
    `;

    // Step 7: Inject scripts and styles into <head>
    const headInjections = `${consoleCaptureScript}\n${navigationBridgeScript}\n${baseNormalizeStyle}${extraStyles ? '\n' + extraStyles : ''}`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${headInjections}\n</head>`);
    } else if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${headInjections}`);
    } else {
      html = `${headInjections}\n${html}`;
    }

    // Step 8: Inject extra scripts before </body> or at end
    if (extraScripts) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${extraScripts}\n</body>`);
      } else {
        html = `${html}\n${extraScripts}`;
      }
    }

    return html;
  };

  const buildPreviewDoc = () => {
    return compileDocument(activeHtmlDoc);
  };

  // Listen to messages from preview iframe (logs and link navigations)
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data) return;
      if (e.data.type === 'L2GETHER_PREVIEW_LOG') {
        setLogs((prev) => [
          ...prev.slice(-100),
          { level: e.data.level, message: e.data.message, time: new Date().toLocaleTimeString() }
        ]);
      } else if (e.data.type === 'L2GETHER_PREVIEW_NAVIGATE') {
        navigateToPage(e.data.target, true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files, navIndex]);

  // Update preview when files change if autoRefresh is enabled (with 200ms debounce)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 200);
    return () => clearTimeout(timer);
  }, [files, autoRefresh]);



  const getViewportWidth = () => {
    if (viewport === 'mobile') return '375px';
    if (viewport === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div className="preview-container">
      {/* Preview Toolbar */}
      <div className="preview-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Back & Forward History */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              className="btn btn-secondary btn-icon sm"
              onClick={handleGoBack}
              disabled={navIndex <= 0}
              title="Go Back (Previous Page)"
              style={{ opacity: navIndex <= 0 ? 0.35 : 1, width: '28px', height: '28px' }}
            >
              <ArrowLeft size={13} />
            </button>
            <button
              className="btn btn-secondary btn-icon sm"
              onClick={handleGoForward}
              disabled={navIndex >= navHistory.length - 1}
              title="Go Forward (Next Page)"
              style={{ opacity: navIndex >= navHistory.length - 1 ? 0.35 : 1, width: '28px', height: '28px' }}
            >
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Page Selector Dropdown */}
          {htmlFiles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FileCode size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <select
                value={activeHtmlDoc?.path || ''}
                onChange={(e) => navigateToPage(e.target.value, true)}
                className="form-select preview-page-select"
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  height: '28px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Select which HTML page to preview"
              >
                {htmlFiles.map((hf) => (
                  <option key={hf.path} value={hf.path}>
                    {hf.path} {hf.path === 'index.html' ? '(Home)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="preview-viewport-toggle">
            <button
              className={`preview-viewport-btn ${viewport === 'desktop' ? 'active' : ''}`}
              onClick={() => setViewport('desktop')}
              title="Desktop View (100%)"
            >
              <Monitor size={14} />
              <span className="hide-on-mobile">Desktop</span>
            </button>
            <button
              className={`preview-viewport-btn ${viewport === 'tablet' ? 'active' : ''}`}
              onClick={() => setViewport('tablet')}
              title="Tablet View (768px)"
            >
              <Tablet size={14} />
              <span className="hide-on-mobile">Tablet</span>
            </button>
            <button
              className={`preview-viewport-btn ${viewport === 'mobile' ? 'active' : ''}`}
              onClick={() => setViewport('mobile')}
              title="Mobile View (375px)"
            >
              <Smartphone size={14} />
              <span className="hide-on-mobile">Mobile</span>
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          <span
            className="badge badge-secondary hide-on-mobile"
            style={{
              fontSize: '0.7rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              border: '1px solid var(--border-color)',
              color: previewModeText.includes('Single-File') ? 'var(--accent-secondary)' : 'var(--text-muted)'
            }}
            title={previewModeText.includes('Single-File') ? 'All CSS and JavaScript are neatly scoped inside index.html' : 'CSS and JavaScript are resolved across workspace files'}
          >
            {previewModeText}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-icon sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh Preview"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className={`btn btn-sm ${showConsole ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowConsole(!showConsole)}
            title="Toggle Preview Console"
          >
            <Terminal size={13} />
            <span className="hide-on-mobile">Console ({logs.length})</span>
          </button>

          <SectionHelpButton
            title="Live Web Preview Help"
            description="Render HTML, CSS, JavaScript, and CDN assets instantly in an isolated real-time sandbox."
            tips={[
              "Instant real-time live updates as you write code in the editor.",
              "Switch responsive viewports between Desktop (100%), Tablet (768px), and Mobile (375px).",
              "Automatic linking: HTML files automatically resolve workspace styles and scripts.",
              "Embedded Web Console captures console.log(), warn(), and runtime error messages."
            ]}
            align="right"
          />

          {isSplit && onCloseSplit && (
            <button
              type="button"
              className="btn btn-subtle btn-icon sm"
              onClick={onCloseSplit}
              title="Close Split Live Preview"
              style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Preview Stage (Zero outer scroll on desktop; device-view scroll for tablet/mobile) */}
      <div className={`preview-stage ${viewport !== 'desktop' ? 'device-view' : ''}`}>
        <div
          className="preview-frame-wrapper"
          style={{ width: getViewportWidth() }}
        >
          <iframe
            key={`${activeHtmlDoc?.path || 'preview'}_${refreshKey}`}
            ref={iframeRef}
            title={`L2gether Live Preview - ${activeHtmlDoc?.path || 'index.html'}`}
            srcDoc={buildPreviewDoc()}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="preview-iframe"
          />
        </div>
      </div>

      {/* In-Preview Console Drawer */}
      {showConsole && (
        <div style={{ height: '160px', backgroundColor: '#0B0D12', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.3rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Preview Web Console</span>
            <button className="btn btn-subtle btn-icon sm" onClick={() => setLogs([])} title="Clear Console">
              <Trash2 size={12} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            {logs.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>Console is clear. Messages from console.log() will appear here.</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', color: log.level === 'error' ? 'var(--state-error)' : log.level === 'warn' ? 'var(--state-warning)' : '#F4F6FB' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
