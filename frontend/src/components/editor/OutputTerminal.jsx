import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  HelpCircle,
  AlertTriangle,
  Package,
  Plus,
  X,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  ChevronRight,
  Send,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Keyboard,
  ListPlus
} from 'lucide-react';

const MAX_TERMINALS = 5;

export default function OutputTerminal({
  socket,
  output,
  isRunning,
  onRun,
  onStop,
  onClear,
  onExecuteCommand,
  onOpenPackageManager,
  files = [],
  activeFilePath = '',
  activeFileContent = '',
  roomId = '',
  stdinData = '',
  setStdinData,
  testCases = [],
  setTestCases,
  onRunTestCases,
  onAdjustHeight,
  isMaximized,
  onToggleMaximize,
  onCloseDock,
  problemsCount = 0,
  onSwitchToProblems
}) {
  // Sub-tab inside Dock: 'terminal' or 'testcases'
  const [subTab, setSubTab] = useState('terminal');

  // Toggle for Stdin drawer
  const [showStdinDrawer, setShowStdinDrawer] = useState(false);

  // Multi-terminal tabs state (up to 5 terminals)
  const [terminals, setTerminals] = useState([
    {
      id: 1,
      name: 'Terminal 1',
      logs: [],
      commandHistory: [],
      historyIndex: -1,
      commandInput: '',
      isRunning: false,
      lastRunCommand: null
    }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState(1);
  const [quickStdinInput, setQuickStdinInput] = useState('');

  // Test cases execution state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [showAddTestCaseModal, setShowAddTestCaseModal] = useState(false);
  const [newTcTitle, setNewTcTitle] = useState('');
  const [newTcInput, setNewTcInput] = useState('');
  const [newTcExpected, setNewTcExpected] = useState('');

  const terminalScrollRef = useRef(null);
  const inputRef = useRef(null);

  // Active terminal helper
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId) || terminals[0];

  // Auto-scroll to bottom of active terminal when logs update
  useEffect(() => {
    if (subTab === 'terminal' && terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [activeTerminal?.logs, isRunning, subTab]);

  // Real-Time Socket.IO Interactive Streaming Terminal Listeners
  useEffect(() => {
    if (!socket) return;

    const handleOutput = ({ data, isError }) => {
      if (data === undefined || data === null) return;
      const cleanData = String(data);

      setTerminals((prev) =>
        prev.map((term) => {
          if (term.id === activeTerminalId) {
            const logs = [...term.logs];
            const lastLog = logs[logs.length - 1];
            if (lastLog && lastLog.pending) {
              const updatedLast = {
                ...lastLog,
                stdout: !isError ? (lastLog.stdout || '') + cleanData : lastLog.stdout,
                stderr: isError ? (lastLog.stderr || '') + cleanData : lastLog.stderr
              };
              logs[logs.length - 1] = updatedLast;
              return { ...term, logs };
            } else {
              const newLog = {
                id: `stream_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: 'stream',
                stdout: !isError ? cleanData : '',
                stderr: isError ? cleanData : '',
                pending: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              };
              return { ...term, isRunning: true, logs: [...logs, newLog] };
            }
          }
          return term;
        })
      );
    };

    const handleExit = ({ exitCode, durationMs }) => {
      setTerminals((prev) =>
        prev.map((term) => {
          if (term.id === activeTerminalId) {
            const updatedLogs = term.logs.map((item, idx) => {
              if (idx === term.logs.length - 1 && item.pending) {
                return {
                  ...item,
                  pending: false,
                  exitCode: exitCode ?? 0,
                  durationMs: durationMs || 0
                };
              }
              return item;
            });
            return {
              ...term,
              isRunning: false,
              logs: updatedLogs
            };
          }
          return term;
        })
      );
    };

    socket.on('terminal_session_output', handleOutput);
    socket.on('terminal_session_exit', handleExit);

    return () => {
      socket.off('terminal_session_output', handleOutput);
      socket.off('terminal_session_exit', handleExit);
    };
  }, [socket, activeTerminalId]);

  // Sync external output into active terminal (from top "Run Code" button)
  useEffect(() => {
    if (output) {
      const isEofError = Boolean(
        output.stderr &&
        (output.stderr.includes('EOFError') || output.stderr.includes('EOF when reading a line'))
      );

      const isCompErr = Boolean(output.isCompilationError || (output.stderr && output.stderr.includes('error:')));

      const logItem = {
        id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'execution',
        command: output.command || (activeFilePath?.endsWith('.py') ? 'python3 -u main.py' : 'gcc -std=c17 -O2 main.c -lm && ./a.out'),
        stdout: output.stdout !== undefined && output.stdout !== null ? String(output.stdout) : '',
        stderr: output.stderr !== undefined && output.stderr !== null ? String(output.stderr) : '',
        compilerOutput: output.compilerOutput || '',
        isCompilationError: isCompErr,
        exitCode: output.exitCode !== undefined ? output.exitCode : (isCompErr ? 1 : 0),
        durationMs: output.durationMs || 0,
        needsInput: isEofError,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setTerminals((prev) =>
        prev.map((term) => {
          if (term.id === activeTerminalId) {
            return {
              ...term,
              logs: [...term.logs, logItem],
              lastRunCommand: output.command || term.lastRunCommand || './a.out'
            };
          }
          return term;
        })
      );
    }
  }, [output]);

  // Add new terminal tab (up to 5 maximum)
  const handleAddTerminal = () => {
    if (terminals.length >= MAX_TERMINALS) return;
    const existingIds = new Set(terminals.map((t) => t.id));
    let newId = 1;
    while (existingIds.has(newId) && newId <= MAX_TERMINALS) {
      newId++;
    }
    const newTerm = {
      id: newId,
      name: `Terminal ${newId}`,
      logs: [],
      commandHistory: [],
      historyIndex: -1,
      commandInput: '',
      isRunning: false,
      lastRunCommand: null
    };
    setTerminals([...terminals, newTerm]);
    setActiveTerminalId(newId);
  };

  // Close a terminal tab
  const handleCloseTerminal = (idToClose, e) => {
    if (e) e.stopPropagation();
    if (terminals.length <= 1) return;
    const remaining = terminals.filter((t) => t.id !== idToClose);
    setTerminals(remaining);
    if (activeTerminalId === idToClose) {
      setActiveTerminalId(remaining[remaining.length - 1].id);
    }
  };

  const updateActiveTerminal = (updates) => {
    setTerminals((prev) =>
      prev.map((t) => (t.id === activeTerminalId ? { ...t, ...updates } : t))
    );
  };

  // Execute terminal CLI command
  const executeCommandInternal = async (cmd, optionalStdin = '') => {
    if (!cmd || !cmd.trim()) return;
    const trimmed = cmd.trim();

    // Built-in clear / cls
    if (trimmed === 'clear' || trimmed === 'cls') {
      updateActiveTerminal({ logs: [] });
      onClear?.();
      return;
    }

    // Built-in help
    if (trimmed === 'help') {
      const helpText = `L2gether Professional C & Python Interactive Terminal:
  • gcc <file.c> [-o <out>]   Compile C source (e.g. gcc main.c -o main)
  • ./main or ./a.out         Execute compiled binary with real interactive scanf
  • python <file.py>          Execute Python script with real interactive input()
  • clear / cls               Clear terminal screen
  • [+] Button                Add up to 5 concurrent terminals

💡 Real Terminal Flow:
  1. The program starts running and prints its prompt (e.g. "Enter your age: ")
  2. The process stays ALIVE in memory while waiting for your input
  3. Type your response in the terminal input box and press Enter
  4. The input is sent directly to the alive process stdin and prints the result
  5. File creation (fopen, open) & deletion (remove, os.remove) automatically sync to workspace!`;

      const helpLog = {
        id: `help_${Date.now()}`,
        type: 'command',
        command: trimmed,
        stdout: helpText,
        stderr: '',
        exitCode: 0,
        durationMs: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      updateActiveTerminal({
        logs: [...activeTerminal.logs, helpLog],
        commandHistory: [...activeTerminal.commandHistory, trimmed],
        historyIndex: -1,
        commandInput: ''
      });
      return;
    }

    // Interactive Real-Time Program Execution via Socket.IO
    const isRunCmd =
      trimmed.startsWith('gcc') ||
      trimmed.startsWith('./') ||
      trimmed.startsWith('.\\') ||
      trimmed.startsWith('python') ||
      trimmed.startsWith('py ') ||
      trimmed === 'run';

    if (socket && socket.connected && isRunCmd) {
      const logId = `cmd_${Date.now()}`;
      updateActiveTerminal({
        commandHistory: [...activeTerminal.commandHistory, trimmed],
        historyIndex: -1,
        commandInput: '',
        isRunning: true,
        lastRunCommand: trimmed,
        logs: [
          ...activeTerminal.logs,
          {
            id: logId,
            type: 'command',
            command: trimmed,
            stdout: '',
            stderr: '',
            pending: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        ]
      });

      const language = (activeFilePath?.endsWith('.py') || trimmed.includes('python')) ? 'python' : 'c';
      socket.emit('terminal_session_start', {
        roomId,
        language,
        code: activeFileContent,
        filename: activeFilePath,
        command: trimmed,
        files: files.map((f) => ({ path: f.path, content: f.content }))
      });
      return;
    }

    const logId = `cmd_${Date.now()}`;
    const nextHistory = [...activeTerminal.commandHistory, trimmed];

    updateActiveTerminal({
      commandHistory: nextHistory,
      historyIndex: -1,
      commandInput: '',
      isRunning: true,
      logs: [
        ...activeTerminal.logs,
        {
          id: logId,
          type: 'command',
          command: trimmed,
          stdout: '',
          stderr: '',
          pending: true
        }
      ]
    });

    if (onExecuteCommand) {
      try {
        const res = await onExecuteCommand(trimmed, optionalStdin);
        setTerminals((prev) =>
          prev.map((t) => {
            if (t.id === activeTerminalId) {
              const updatedLogs = t.logs.map((item) =>
                item.id === logId
                  ? {
                      ...item,
                      pending: false,
                      stdout: res.stdout || '',
                      stderr: res.stderr || '',
                      exitCode: res.exitCode !== undefined ? res.exitCode : 0,
                      durationMs: res.durationMs || 0,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    }
                  : item
              );
              return {
                ...t,
                isRunning: false,
                lastRunCommand: trimmed,
                logs: updatedLogs
              };
            }
            return t;
          })
        );
      } catch (err) {
        setTerminals((prev) =>
          prev.map((t) => {
            if (t.id === activeTerminalId) {
              const updatedLogs = t.logs.map((item) =>
                item.id === logId
                  ? {
                      ...item,
                      pending: false,
                      stdout: '',
                      stderr: 'Execution failed: ' + err.message,
                      exitCode: 1,
                      durationMs: 0
                    }
                  : item
              );
              return { ...t, isRunning: false, logs: updatedLogs };
            }
            return t;
          })
        );
      }
    }
  };

  // Stop running interactive process
  const handleStopProgram = () => {
    if (socket && socket.connected) {
      socket.emit('terminal_session_stop');
    }
    onStop?.();
    updateActiveTerminal({ isRunning: false });
  };

  const handleCommandSubmit = (e) => {
    if (e) e.preventDefault();
    const raw = (activeTerminal.commandInput || '').trim();
    if (!raw) return;

    // If program is alive and running, send input directly to alive process stdin!
    if (activeTerminal.isRunning) {
      if (socket && socket.connected) {
        socket.emit('terminal_session_input', { input: raw + '\n' });
        // Echo input into active terminal display like real terminal
        setTerminals((prev) =>
          prev.map((term) => {
            if (term.id === activeTerminalId) {
              const logs = [...term.logs];
              const lastLog = logs[logs.length - 1];
              if (lastLog && lastLog.pending) {
                lastLog.stdout = (lastLog.stdout || '') + raw + '\n';
              }
              return { ...term, logs };
            }
            return term;
          })
        );
      }
      updateActiveTerminal({ commandInput: '' });
      return;
    }

    executeCommandInternal(raw);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = activeTerminal.commandHistory;
      if (history.length === 0) return;
      const nextIndex =
        activeTerminal.historyIndex === -1 ? history.length - 1 : Math.max(0, activeTerminal.historyIndex - 1);
      updateActiveTerminal({
        historyIndex: nextIndex,
        commandInput: history[nextIndex] || ''
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = activeTerminal.commandHistory;
      if (activeTerminal.historyIndex === -1) return;
      const nextIndex = activeTerminal.historyIndex + 1;
      if (nextIndex >= history.length) {
        updateActiveTerminal({
          historyIndex: -1,
          commandInput: ''
        });
      } else {
        updateActiveTerminal({
          historyIndex: nextIndex,
          commandInput: history[nextIndex] || ''
        });
      }
    }
  };

  const handleClearCurrent = () => {
    updateActiveTerminal({ logs: [] });
    onClear?.();
  };

  // Quick re-run with supplied stdin
  const handleQuickReRun = (e) => {
    if (e) e.preventDefault();
    const val = quickStdinInput.trim();
    if (onRun) {
      if (setStdinData) setStdinData(val);
      onRun(val ? val + '\n' : '');
    }
    setQuickStdinInput('');
  };

  // Run automated test cases
  const handleRunAllTests = async () => {
    if (!onRunTestCases || isRunningTests) return;
    setIsRunningTests(true);
    try {
      const res = await onRunTestCases();
      setTestResults(res);
    } catch (err) {
      alert('Failed to run test cases: ' + err.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleAddTestCase = () => {
    if (!newTcExpected && !newTcInput) return;
    const newCase = {
      id: `tc_${Date.now()}`,
      title: newTcTitle.trim() || `Test Case #${testCases.length + 1}`,
      input: newTcInput,
      expectedOutput: newTcExpected
    };
    if (setTestCases) {
      setTestCases([...testCases, newCase]);
    }
    setNewTcTitle('');
    setNewTcInput('');
    setNewTcExpected('');
    setShowAddTestCaseModal(false);
  };

  const handleDeleteTestCase = (tcId) => {
    if (setTestCases) {
      setTestCases(testCases.filter((tc) => tc.id !== tcId));
    }
    if (testResults && testResults.results) {
      setTestResults({
        ...testResults,
        results: testResults.results.filter((r) => r.id !== tcId)
      });
    }
  };

  const handleAddSampleTestCases = () => {
    const isPy = activeFilePath?.endsWith('.py');
    const samples = isPy
      ? [
          { id: 'sample_1', title: 'Sample 1: Basic Input', input: '10\n20', expectedOutput: '30' },
          { id: 'sample_2', title: 'Sample 2: Zero Values', input: '0\n0', expectedOutput: '0' },
          { id: 'sample_3', title: 'Sample 3: Negative Input', input: '-5\n15', expectedOutput: '10' }
        ]
      : [
          { id: 'sample_1', title: 'Sample 1: Standard Input', input: '42', expectedOutput: 'Answer: 42' },
          { id: 'sample_2', title: 'Sample 2: Double Value', input: '10', expectedOutput: 'Answer: 10' }
        ];
    if (setTestCases) {
      setTestCases([...testCases, ...samples]);
    }
  };

  const cFile = files.find((f) => f.path && f.path.endsWith('.c'))?.path || 'main.c';
  const pyFile = files.find((f) => f.path && f.path.endsWith('.py'))?.path || 'main.py';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#0B0D12' }}>
      {/* Top Dock Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 0.65rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
          flexShrink: 0
        }}
      >
        {/* Left Side: Sub-Tabs & Multi-Terminals */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Main Sub-Tab Switcher: Terminal vs Test Cases */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '2px', borderRadius: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm ${subTab === 'terminal' ? 'btn-secondary' : 'btn-subtle'}`}
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                height: '24px',
                gap: '4px',
                fontWeight: subTab === 'terminal' ? 600 : 400
              }}
              onClick={() => setSubTab('terminal')}
            >
              <TerminalIcon size={12} color={subTab === 'terminal' ? '#38BDF8' : 'var(--text-muted)'} />
              <span>Terminal</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${subTab === 'testcases' ? 'btn-secondary' : 'btn-subtle'}`}
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                height: '24px',
                gap: '4px',
                fontWeight: subTab === 'testcases' ? 600 : 400
              }}
              onClick={() => setSubTab('testcases')}
              title="Automated Test Cases & Expected Output Comparison"
            >
              <CheckCircle2 size={12} color={testCases.length > 0 ? '#34D399' : 'var(--text-muted)'} />
              <span>Test Cases ({testCases.length})</span>
            </button>
          </div>

          {/* If Terminal mode: Multi-Terminal Tabs Strip */}
          {subTab === 'terminal' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div className="terminal-tabs-strip">
                {terminals.map((t) => {
                  const isActive = t.id === activeTerminalId;
                  return (
                    <div
                      key={t.id}
                      className={`terminal-tab-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveTerminalId(t.id)}
                      title={`Switch to ${t.name}`}
                    >
                      <TerminalIcon size={12} color={isActive ? '#38BDF8' : 'var(--text-muted)'} />
                      <span>{t.name}</span>
                      {t.isRunning && (
                        <span className="live-pulse" style={{ width: '5px', height: '5px', backgroundColor: '#F59E0B' }} />
                      )}
                      {terminals.length > 1 && (
                        <button
                          type="button"
                          className="terminal-tab-close"
                          onClick={(e) => handleCloseTerminal(t.id, e)}
                          title={`Close ${t.name}`}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="terminal-add-tab-btn"
                onClick={handleAddTerminal}
                disabled={terminals.length >= MAX_TERMINALS}
                title={terminals.length >= MAX_TERMINALS ? 'Maximum 5 terminals reached' : 'Add new terminal tab (+)'}
              >
                <Plus size={13} />
              </button>
            </div>
          )}

          {/* Stdin Drawer Toggle Button */}
          <button
            type="button"
            className={`btn btn-sm ${showStdinDrawer || (stdinData && stdinData.trim()) ? 'btn-secondary' : 'btn-subtle'}`}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              height: '24px',
              gap: '4px',
              borderColor: (stdinData && stdinData.trim()) ? '#38BDF8' : undefined
            }}
            onClick={() => setShowStdinDrawer(!showStdinDrawer)}
            title="Toggle Standard Input (stdin) Panel for pre-filling input"
          >
            <Keyboard size={12} color={(stdinData && stdinData.trim()) ? '#38BDF8' : 'var(--text-muted)'} />
            <span>Stdin {(stdinData && stdinData.trim()) ? '• Active' : ''}</span>
          </button>

          {/* Interactive Live Run / Stop Button */}
          <button
            type="button"
            className={`btn btn-sm ${activeTerminal.isRunning ? 'btn-danger' : 'btn-primary'}`}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              height: '24px',
              gap: '4px'
            }}
            onClick={() => {
              if (activeTerminal.isRunning) {
                handleStopProgram();
              } else {
                executeCommandInternal(activeFilePath?.endsWith('.py') ? `python ${pyFile}` : `./main`);
              }
            }}
            title={activeTerminal.isRunning ? 'Stop running process' : 'Run in live interactive terminal'}
          >
            {activeTerminal.isRunning ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
            <span>{activeTerminal.isRunning ? 'Stop' : 'Run'}</span>
          </button>

          {/* Switch to Problems Panel Button */}
          {onSwitchToProblems && (
            <button
              type="button"
              className="btn btn-subtle btn-sm"
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                height: '24px',
                color: problemsCount > 0 ? '#F87171' : 'var(--text-secondary)',
                gap: '4px'
              }}
              onClick={onSwitchToProblems}
              title="View Code Problems"
            >
              <AlertTriangle size={12} color={problemsCount > 0 ? '#F87171' : 'var(--text-muted)'} />
              <span>Problems ({problemsCount})</span>
            </button>
          )}
        </div>

        {/* Right Side Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
          {/* Height Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
            <button
              type="button"
              className="btn btn-subtle btn-sm"
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => onAdjustHeight?.(160)}
              title="Compact View (160px)"
            >
              160px
            </button>
            <button
              type="button"
              className="btn btn-subtle btn-sm"
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => onAdjustHeight?.(320)}
              title="Standard View (320px)"
            >
              320px
            </button>
            <button
              type="button"
              className="btn btn-subtle btn-sm"
              style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px' }}
              onClick={() => onAdjustHeight?.(480)}
              title="Expanded View (480px)"
            >
              480px
            </button>
            <button
              type="button"
              className="btn btn-subtle btn-icon sm"
              style={{ width: '22px', height: '22px', padding: 0 }}
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restore View Height' : 'Maximize Terminal Height'}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>

          {subTab === 'terminal' && (
            <>
              <button
                type="button"
                className="btn btn-subtle btn-sm"
                style={{ fontSize: '0.7rem', padding: '2px 7px', height: '22px' }}
                onClick={() => executeCommandInternal('help')}
                title="Terminal CLI Help"
              >
                <HelpCircle size={12} />
                <span className="hide-on-mobile">Help</span>
              </button>
              <button
                type="button"
                className="btn btn-subtle btn-icon sm"
                style={{ width: '22px', height: '22px', padding: 0 }}
                onClick={handleClearCurrent}
                title="Clear terminal output"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}

          {onCloseDock && (
            <button
              type="button"
              className="btn btn-subtle btn-icon sm"
              style={{ width: '22px', height: '22px', padding: 0 }}
              onClick={onCloseDock}
              title="Hide Panel"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Standard Input (stdin) Panel */}
      {showStdinDrawer && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#07090E',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', color: '#38BDF8', fontWeight: 600 }}>
              ⌨️ Standard Input (stdin) — Feed inputs to scanf() / input():
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-subtle btn-sm"
                style={{ fontSize: '0.68rem', padding: '1px 6px', height: '20px' }}
                onClick={() => setStdinData?.('')}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-subtle btn-sm"
                style={{ fontSize: '0.68rem', padding: '1px 6px', height: '20px' }}
                onClick={() => setShowStdinDrawer(false)}
              >
                Collapse
              </button>
            </div>
          </div>
          <textarea
            rows={3}
            value={stdinData || ''}
            onChange={(e) => setStdinData?.(e.target.value)}
            placeholder="Type or paste input here (one value per line, or space-separated). When you click 'Run Code', this input will be sent to your program automatically."
            style={{
              width: '100%',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '4px',
              color: '#38BDF8',
              padding: '6px 8px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* MAIN VIEW 1: Terminal Screen */}
      {subTab === 'terminal' && (
        <>
          <div
            ref={terminalScrollRef}
            className="dock-body"
            style={{
              flex: 1,
              backgroundColor: '#0B0D12',
              color: '#E2E8F0',
              padding: '0.75rem',
              fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
              fontSize: '0.82rem',
              lineHeight: '1.45',
              overflowY: 'auto'
            }}
          >
            {activeTerminal.logs.length === 0 && !activeTerminal.isRunning && (
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                [{activeTerminal.name}] Ready. Real C &amp; Python compiler active.
                Click <strong>Run Code</strong> above or type commands below (e.g. <code>gcc {cFile} -o a.out</code>, <code>./a.out</code>, <code>python {pyFile}</code>, <code>ls</code>).
              </div>
            )}

            {activeTerminal.logs.map((log) => {
              return (
                <div key={log.id} style={{ marginBottom: '1rem' }}>
                  {/* Command Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6EE7B7', fontWeight: 600 }}>
                    <span style={{ color: '#3B82F6' }}>user@l2gether</span>
                    <span style={{ color: '#94A3B8' }}>:</span>
                    <span style={{ color: '#F59E0B' }}>~/workspace</span>
                    <span style={{ color: '#94A3B8' }}>$</span>
                    <span style={{ color: '#F1F5F9' }}>{log.command}</span>

                    {log.durationMs !== undefined && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748B', fontWeight: 400 }}>
                        {log.durationMs}ms
                      </span>
                    )}
                  </div>

                  {/* Execution pending spinner */}
                  {log.pending && (
                    <div style={{ color: '#94A3B8', marginTop: '4px', fontStyle: 'italic' }}>
                      ⏳ Compiling and executing in {activeTerminal.name}...
                    </div>
                  )}

                  {/* Compiler Warnings / Messages Banner */}
                  {log.compilerOutput && !log.isCompilationError && log.compilerOutput.trim() && (
                    <pre
                      style={{
                        margin: '4px 0 0',
                        whiteSpace: 'pre-wrap',
                        color: '#FBBF24',
                        backgroundColor: 'rgba(245, 158, 11, 0.06)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.78rem'
                      }}
                    >
                      {log.compilerOutput}
                    </pre>
                  )}

                  {/* Genuine Unaltered Stdout Output */}
                  {log.stdout !== undefined && log.stdout !== '' && (
                    <pre
                      style={{
                        margin: '4px 0 0',
                        whiteSpace: 'pre-wrap',
                        color: '#34D399',
                        fontFamily: 'inherit'
                      }}
                    >
                      {log.stdout}
                    </pre>
                  )}

                  {/* Genuine Unaltered Stderr / Compilation Errors Output */}
                  {log.stderr !== undefined && log.stderr !== '' && (
                    <pre
                      style={{
                        margin: '4px 0 0',
                        whiteSpace: 'pre-wrap',
                        color: '#F87171',
                        fontFamily: 'inherit'
                      }}
                    >
                      {log.stderr}
                    </pre>
                  )}

                  {/* Status Exit Pill */}
                  {!log.pending && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.74rem' }}>
                      {log.isCompilationError ? (
                        <span style={{ color: '#F87171', fontWeight: 600 }}>
                          ✗ Compilation Error (exit code {log.exitCode})
                        </span>
                      ) : log.exitCode === 0 ? (
                        <span style={{ color: '#34D399', fontWeight: 600 }}>
                          ✓ Process finished with exit code 0
                        </span>
                      ) : (
                        <span style={{ color: '#F87171', fontWeight: 600 }}>
                          ✗ Process terminated with exit code {log.exitCode}
                        </span>
                      )}
                      {log.durationMs > 0 && (
                        <span style={{ color: '#64748B' }}>
                          in {log.durationMs}ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* Interactive Standard Input Prompt Banner (if program finished requesting input) */}
                  {log.needsInput && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ color: '#38BDF8', fontWeight: 600, fontSize: '0.78rem', marginBottom: '2px' }}>
                        ⌨️ Standard Input Required (scanf / input)
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.72rem', marginBottom: '6px' }}>
                        This program requested input from stdin. Type your input below and press <strong>Send &amp; Re-run</strong>:
                      </div>
                      <form onSubmit={handleQuickReRun} style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Type input here (e.g. 10 20 or Hello)..."
                          value={quickStdinInput}
                          onChange={(e) => setQuickStdinInput(e.target.value)}
                          style={{
                            flex: 1,
                            backgroundColor: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#F8FAFC',
                            fontSize: '0.8rem',
                            outline: 'none'
                          }}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                          Send &amp; Re-run
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Shell Input Prompt */}
          <form
            onSubmit={handleCommandSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#06080C',
              borderTop: '1px solid var(--border-color)',
              padding: '0.35rem 0.65rem',
              gap: '6px',
              flexShrink: 0
            }}
          >
            <span style={{ color: activeTerminal.isRunning ? '#10B981' : '#3B82F6', fontWeight: 700, fontSize: '0.78rem' }}>
              {activeTerminal.isRunning ? '▶' : '$'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={activeTerminal.commandInput}
              onChange={(e) => updateActiveTerminal({ commandInput: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder={
                activeTerminal.isRunning
                  ? '🟢 Program is alive & waiting for input... Type here and press Enter'
                  : `Type shell command (e.g. gcc ${cFile} -o a.out, ./a.out, python ${pyFile}, ls, help)...`
              }
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: activeTerminal.isRunning ? '#38BDF8' : '#F1F5F9',
                fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            {activeTerminal.isRunning ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.72rem', height: '24px' }}
                  title="Send input to running program"
                >
                  <Send size={12} />
                  <span>Send</span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.72rem', height: '24px' }}
                  onClick={handleStopProgram}
                  title="Terminate running process"
                >
                  <Square size={12} />
                  <span>Stop</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="btn btn-subtle btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', height: '24px' }}
                title="Execute command"
              >
                <CornerDownLeft size={12} />
                <span>Enter</span>
              </button>
            )}
          </form>
        </>
      )}

      {/* MAIN VIEW 2: Automated Test Cases Suite */}
      {subTab === 'testcases' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0B0D12', overflow: 'hidden' }}>
          {/* Test Cases Header Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid var(--border-color)',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E2E8F0' }}>
                Automated Test Suite
              </span>
              {testResults && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    backgroundColor: testResults.allPassed ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                    color: testResults.allPassed ? '#34D399' : '#F87171'
                  }}
                >
                  {testResults.passedCount} / {testResults.total} PASSED
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRunAllTests}
                disabled={isRunningTests || testCases.length === 0}
                style={{ fontSize: '0.75rem', padding: '3px 10px', height: '26px', gap: '4px' }}
              >
                <Play size={12} fill="currentColor" />
                <span>{isRunningTests ? 'Testing...' : 'Run All Tests'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddTestCaseModal(true)}
                style={{ fontSize: '0.75rem', padding: '3px 10px', height: '26px', gap: '4px' }}
              >
                <Plus size={12} />
                <span>Add Test Case</span>
              </button>

              {testCases.length === 0 && (
                <button
                  type="button"
                  className="btn btn-subtle btn-sm"
                  onClick={handleAddSampleTestCases}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', height: '26px' }}
                >
                  <ListPlus size={12} />
                  <span>Load Samples</span>
                </button>
              )}
            </div>
          </div>

          {/* Test Cases List */}
          <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
            {testCases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8' }}>
                <CheckCircle2 size={32} color="#475569" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ color: '#E2E8F0', marginBottom: '0.35rem' }}>No Test Cases Defined</h4>
                <p style={{ fontSize: '0.78rem', maxWidth: '380px', margin: '0 auto 1rem', lineHeight: '1.4' }}>
                  Add input and expected output test cases to automatically verify that your C or Python program satisfies all requirements and edge cases.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddTestCaseModal(true)}>
                    <Plus size={12} />
                    <span>Create Test Case</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleAddSampleTestCases}>
                    <ListPlus size={12} />
                    <span>Add Sample Test Cases</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {testCases.map((tc, idx) => {
                  const result = testResults?.results?.find((r) => r.id === tc.id);
                  const isPassed = result?.passed;
                  const isFailed = result && !result.passed;

                  return (
                    <div
                      key={tc.id}
                      style={{
                        backgroundColor: '#0F131C',
                        border: `1px solid ${isPassed ? 'rgba(52, 211, 153, 0.4)' : isFailed ? 'rgba(248, 113, 113, 0.4)' : '#1E293B'}`,
                        borderRadius: '6px',
                        padding: '0.65rem 0.85rem'
                      }}
                    >
                      {/* Case Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.8rem' }}>
                            {tc.title || `Test Case #${idx + 1}`}
                          </span>

                          {result && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                backgroundColor: isPassed ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                color: isPassed ? '#34D399' : '#F87171'
                              }}
                            >
                              {result.status}
                            </span>
                          )}

                          {result?.durationMs !== undefined && (
                            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                              {result.durationMs}ms
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn btn-subtle btn-icon sm"
                          onClick={() => handleDeleteTestCase(tc.id)}
                          title="Delete test case"
                          style={{ width: '20px', height: '20px', padding: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Inputs & Outputs Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                        <div>
                          <div style={{ color: '#94A3B8', marginBottom: '2px', fontWeight: 500 }}>
                            Input (stdin)
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '4px 6px',
                              backgroundColor: '#07090E',
                              border: '1px solid #1E293B',
                              borderRadius: '4px',
                              color: '#38BDF8',
                              maxHeight: '70px',
                              overflowY: 'auto'
                            }}
                          >
                            {tc.input || '(empty)'}
                          </pre>
                        </div>

                        <div>
                          <div style={{ color: '#94A3B8', marginBottom: '2px', fontWeight: 500 }}>
                            Expected Output
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '4px 6px',
                              backgroundColor: '#07090E',
                              border: '1px solid #1E293B',
                              borderRadius: '4px',
                              color: '#34D399',
                              maxHeight: '70px',
                              overflowY: 'auto'
                            }}
                          >
                            {tc.expectedOutput || '(empty)'}
                          </pre>
                        </div>

                        <div>
                          <div style={{ color: '#94A3B8', marginBottom: '2px', fontWeight: 500 }}>
                            Actual Output
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '4px 6px',
                              backgroundColor: '#07090E',
                              border: '1px solid #1E293B',
                              borderRadius: '4px',
                              color: isPassed ? '#34D399' : isFailed ? '#F87171' : '#64748B',
                              maxHeight: '70px',
                              overflowY: 'auto'
                            }}
                          >
                            {result ? (result.actualOutput || '(no output)') : '(not run yet)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Test Case Modal */}
      {showAddTestCaseModal && (
        <div className="modal-backdrop" onClick={() => setShowAddTestCaseModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Add Automated Test Case</h3>
              <button className="btn btn-subtle btn-icon" onClick={() => setShowAddTestCaseModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#CBD5E1' }}>
                  Test Case Name / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Test Case 1: Standard Positive Numbers"
                  value={newTcTitle}
                  onChange={(e) => setNewTcTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#CBD5E1' }}>
                  Input (stdin)
                </label>
                <textarea
                  rows={3}
                  placeholder="Values to feed into scanf() or input(), one per line..."
                  value={newTcInput}
                  onChange={(e) => setNewTcInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: '#38BDF8',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#CBD5E1' }}>
                  Expected Output (stdout)
                </label>
                <textarea
                  rows={3}
                  placeholder="Expected output string (compared after trimming trailing whitespace)..."
                  value={newTcExpected}
                  onChange={(e) => setNewTcExpected(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: '#34D399',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTestCaseModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleAddTestCase}>
                Save Test Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
