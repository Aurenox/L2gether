import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  CheckSquare,
  Copy,
  Scissors,
  Clipboard,
  RotateCcw,
  RotateCw,
  Check
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { detectLanguageFromPath } from '../../utils/templates';
import { expandEmmetAbbreviation, LANGUAGE_SNIPPETS } from '../../utils/snippets';

export default function MonacoEditorWrapper({
  filePath,
  content,
  onChange,
  onSave,
  onOpenTemplatePicker,
  onOpenQuickOpen,
  onOpenCommandPalette,
  socket,
  roomId,
  userSession,
  readOnly = false
}) {
  const { monacoTheme } = useTheme();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isRemoteChangeRef = useRef(false);
  const [feedback, setFeedback] = useState('');
  const feedbackTimerRef = useRef(null);

  const showFeedback = (msg) => {
    setFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback('');
    }, 1800);
  };

  // Map our language names to Monaco language identifiers
  const getMonacoLanguage = (path) => {
    const detected = detectLanguageFromPath(path);
    const map = {
      html: 'html',
      css: 'css',
      javascript: 'javascript',
      typescript: 'typescript',
      react: 'javascript', // Monaco treats JSX nicely under javascript or typescript
      python: 'python',
      c: 'c',
      json: 'json',
      markdown: 'markdown'
    };
    return map[detected] || 'plaintext';
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 1. Register language snippet providers for smart coding
    Object.entries(LANGUAGE_SNIPPETS).forEach(([lang, snippets]) => {
      const monacoLang = lang === 'react' ? 'javascript' : lang;
      try {
        monaco.languages.registerCompletionItemProvider(monacoLang, {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            const suggestions = snippets.map((s) => ({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: s.snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: s.detail,
              range
            }));

            return { suggestions };
          }
        });
      } catch (e) {}
    });

    // 2. Custom Keybindings
    // Ctrl + S: Force Save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });

    // Ctrl + P: Quick file open
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      if (onOpenQuickOpen) onOpenQuickOpen();
    });

    // Ctrl + Shift + P: Command Palette
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      if (onOpenCommandPalette) onOpenCommandPalette();
    });

    // Shift + ! : Open Universal Starter Template Picker
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Digit1, () => {
      if (onOpenTemplatePicker) onOpenTemplatePicker();
    });

    // Emmet abbreviation expansion on Tab key for HTML/JSX/CSS
    editor.addCommand(monaco.KeyCode.Tab, () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      const lineContent = model.getLineContent(position.lineNumber);
      const textBefore = lineContent.substring(0, position.column - 1);
      const match = textBefore.match(/([a-zA-Z0-9_#.*>-]+)$/);

      if (match) {
        const abbr = match[1];
        const expanded = expandEmmetAbbreviation(abbr);
        if (expanded) {
          const startCol = position.column - abbr.length;
          editor.executeEdits('emmet', [
            {
              range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column),
              text: expanded
            }
          ]);
          return;
        }
      }

      // Default tab indentation fallback
      editor.trigger('keyboard', 'tab', null);
    });

    // 3. Track cursor movement & broadcast to collaborators
    editor.onDidChangeCursorPosition((e) => {
      if (socket && roomId) {
        socket.emit('cursor_move', {
          roomId,
          path: filePath,
          line: e.position.lineNumber,
          column: e.position.column
        });
      }
    });
  };

  // Listen to remote changes from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleRemoteChange = ({ path, content: remoteContent }) => {
      if (path === filePath && editorRef.current && remoteContent !== editorRef.current.getValue()) {
        isRemoteChangeRef.current = true;
        const pos = editorRef.current.getPosition();
        editorRef.current.setValue(remoteContent);
        if (pos) editorRef.current.setPosition(pos);
        isRemoteChangeRef.current = false;
      }
    };

    socket.on('remote_code_change', handleRemoteChange);
    return () => {
      socket.off('remote_code_change', handleRemoteChange);
    };
  }, [socket, filePath]);

  const handleEditorChange = (value) => {
    if (isRemoteChangeRef.current) return;
    onChange(value);

    // Broadcast code change to collaborators
    if (socket && roomId) {
      socket.emit('code_change', {
        roomId,
        path: filePath,
        content: value
      });
    }
  };

  // Mobile / Quick Selection & Clipboard Actions
  const handleSelectAll = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (model) {
      editor.setSelection(model.getFullModelRange());
      editor.focus();
      showFeedback('All code selected');
    }
  };

  const handleCopy = async () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const selection = editor.getSelection();
    const model = editor.getModel();
    let text = '';
    if (selection && !selection.isEmpty() && model) {
      text = model.getValueInRange(selection);
    } else {
      text = editor.getValue();
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showFeedback('Copied to clipboard!');
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showFeedback('Copied to clipboard!');
      }
    } catch (e) {
      showFeedback('Copy failed');
    }
  };

  const handleCut = async () => {
    if (!editorRef.current || readOnly) return;
    const editor = editorRef.current;
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model) return;
    let text = '';
    if (selection && !selection.isEmpty()) {
      text = model.getValueInRange(selection);
      try {
        await navigator.clipboard.writeText(text);
        editor.executeEdits('mobile-cut', [{ range: selection, text: '' }]);
        showFeedback('Cut to clipboard!');
      } catch (e) {
        showFeedback('Cut failed');
      }
    } else {
      text = editor.getValue();
      try {
        await navigator.clipboard.writeText(text);
        editor.setValue('');
        showFeedback('Cut all to clipboard!');
      } catch (e) {
        showFeedback('Cut failed');
      }
    }
  };

  const handlePaste = async () => {
    if (!editorRef.current || readOnly) return;
    const editor = editorRef.current;
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const selection = editor.getSelection();
          if (selection) {
            editor.executeEdits('mobile-paste', [{ range: selection, text }]);
          } else {
            editor.trigger('keyboard', 'paste', null);
          }
          showFeedback('Pasted from clipboard!');
          return;
        }
      }
    } catch (e) {
      // Permission prompt blocked or unavailable
    }
    const userText = window.prompt('Paste text to insert:');
    if (userText !== null && userText !== undefined) {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('mobile-paste', [{ range: selection, text: userText }]);
      } else if (monacoRef.current) {
        const range = new monacoRef.current.Range(1, 1, 1, 1);
        editor.executeEdits('mobile-paste', [{ range, text: userText }]);
      }
      showFeedback('Pasted text!');
    }
  };

  const handleUndo = () => {
    if (editorRef.current && !readOnly) {
      editorRef.current.trigger('keyboard', 'undo', null);
      showFeedback('Undo');
    }
  };

  const handleRedo = () => {
    if (editorRef.current && !readOnly) {
      editorRef.current.trigger('keyboard', 'redo', null);
      showFeedback('Redo');
    }
  };

  return (
    <div className="monaco-wrapper">
      {/* Mobile / Touch Quick Text Selection & Clipboard Actions */}
      <div className="editor-mobile-actions-bar">
        <div className="editor-mobile-actions-group">
          <button
            type="button"
            className="editor-action-chip accent"
            onClick={handleSelectAll}
            title="Select all text in this file"
          >
            <CheckSquare size={13} />
            <span>Select All</span>
          </button>
          <button
            type="button"
            className="editor-action-chip"
            onClick={handleCopy}
            title="Copy selected text or entire file"
          >
            <Copy size={13} />
            <span>Copy</span>
          </button>
          <button
            type="button"
            className="editor-action-chip"
            onClick={handleCut}
            disabled={readOnly}
            title={readOnly ? 'File is locked' : 'Cut selected text or entire file'}
            style={{ opacity: readOnly ? 0.4 : 1 }}
          >
            <Scissors size={13} />
            <span>Cut</span>
          </button>
          <button
            type="button"
            className="editor-action-chip"
            onClick={handlePaste}
            disabled={readOnly}
            title={readOnly ? 'File is locked' : 'Paste clipboard text'}
            style={{ opacity: readOnly ? 0.4 : 1 }}
          >
            <Clipboard size={13} />
            <span>Paste</span>
          </button>
        </div>

        {feedback && (
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--state-success, #10B981)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 6px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <Check size={12} />
            <span>{feedback}</span>
          </div>
        )}

        <div className="editor-mobile-actions-group">
          <button
            type="button"
            className="editor-action-chip"
            onClick={handleUndo}
            disabled={readOnly}
            title="Undo"
            style={{ opacity: readOnly ? 0.4 : 1 }}
          >
            <RotateCcw size={12} />
            <span className="hide-on-mobile">Undo</span>
          </button>
          <button
            type="button"
            className="editor-action-chip"
            onClick={handleRedo}
            disabled={readOnly}
            title="Redo"
            style={{ opacity: readOnly ? 0.4 : 1 }}
          >
            <RotateCw size={12} />
            <span className="hide-on-mobile">Redo</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Editor
          path={filePath}
          language={getMonacoLanguage(filePath)}
          value={content}
          theme={monacoTheme}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: Boolean(readOnly),
            automaticLayout: true,
            minimap: { enabled: true },
            tabSize: 2,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true,
            cursorBlinking: 'smooth'
          }}
          loading={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading Monaco Editor...</div>}
        />
      </div>
    </div>
  );
}
