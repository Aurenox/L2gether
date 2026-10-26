import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
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

  return (
    <div className="monaco-wrapper">
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
  );
}
