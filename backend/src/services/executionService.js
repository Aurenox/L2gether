import { spawn, execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

export const RUNNER_DIR = join(tmpdir(), 'l2gether-runner');
if (!existsSync(RUNNER_DIR)) {
  mkdirSync(RUNNER_DIR, { recursive: true });
}

// Automatically add common compiler directories (MSYS2, MinGW, Clang, Strawberry) to PATH on Windows
if (process.platform === 'win32') {
  const commonWindowsCompilerPaths = [
    'C:\\msys64\\ucrt64\\bin',
    'C:\\msys64\\mingw64\\bin',
    'C:\\msys64\\clang64\\bin',
    'C:\\msys64\\usr\\bin',
    'C:\\MinGW\\bin',
    'C:\\Strawberry\\c\\bin',
    'C:\\Program Files\\LLVM\\bin',
    'C:\\TDM-GCC-64\\bin'
  ];
  for (const p of commonWindowsCompilerPaths) {
    if (existsSync(p) && !process.env.PATH.includes(p)) {
      process.env.PATH = `${p};${process.env.PATH}`;
    }
  }
}

/**
 * Parses compiler/runtime output for structured problems
 * (file, line, column, message, severity)
 */
export function extractProblems(stderr, stdout, language) {
  const problems = [];
  const text = `${stderr}\n${stdout}`;
  const lines = text.split('\n');

  for (const line of lines) {
    // Python traceback: File "main.py", line 4, in <module>
    const pyMatch = line.match(/File\s+["'](.+?)["'],\s+line\s+(\d+)(?:,\s+in\s+(.+))?/i);
    if (pyMatch) {
      problems.push({
        file: pyMatch[1],
        line: parseInt(pyMatch[2], 10),
        column: 1,
        severity: 'error',
        message: line.trim()
      });
      continue;
    }

    // GCC / Clang / C++: main.cpp:5:10: error: 'x' was not declared
    const gccMatch = line.match(/^(.+?):(\d+):(\d+):\s+(error|warning|note):\s+(.+)$/i);
    if (gccMatch) {
      problems.push({
        file: gccMatch[1],
        line: parseInt(gccMatch[2], 10),
        column: parseInt(gccMatch[3], 10),
        severity: gccMatch[4].toLowerCase() === 'warning' ? 'warning' : 'error',
        message: gccMatch[5].trim()
      });
      continue;
    }

    // Node.js syntax error / stack: /path/file.js:4:10 or file.js:4
    const nodeMatch = line.match(/([a-zA-Z0-9_.-]+\.js):(\d+)(?::(\d+))?/i);
    if (nodeMatch && (line.includes('Error:') || line.includes('SyntaxError:'))) {
      problems.push({
        file: nodeMatch[1],
        line: parseInt(nodeMatch[2], 10),
        column: nodeMatch[3] ? parseInt(nodeMatch[3], 10) : 1,
        severity: 'error',
        message: line.trim()
      });
      continue;
    }
  }

  return problems;
}

/**
 * Detects working native Python executable (python, py, python3)
 */
export function detectPythonCommand() {
  const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      const out = execSync(`${cmd} --version`, { timeout: 2500, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (out && (out.includes('Python') || out.includes('3.'))) {
        return { command: cmd, version: out.trim() };
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Detects working native GCC/Clang compiler
 */
export function detectGccCommand() {
  const candidates = ['gcc', 'clang', 'g++'];
  for (const cmd of candidates) {
    try {
      const out = execSync(`${cmd} --version`, { timeout: 2500, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (out && (out.includes('Free Software Foundation') || out.includes('clang') || out.includes('LLVM') || out.includes('GCC') || out.includes('gcc') || out.includes('MSYS2'))) {
        return { command: cmd, version: out.split('\n')[0].trim() };
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Universal Zero-Config Cloud Compiler Fallback (Wandbox API)
 * Compiles and executes C, C++, and Python code when local host compilers are not present.
 * Uses a generous 30-second timeout to prevent premature network latency aborts.
 */
export async function executeViaWandbox({ language, code, stdin = '', files = [] }) {
  const startTime = Date.now();
  const lang = (language || '').toLowerCase();
  let compiler = 'gcc-13.2.0-c';
  if (lang === 'python' || lang === 'py') {
    compiler = 'cpython-3.12.7';
  } else if (lang === 'c') {
    compiler = 'gcc-13.2.0-c';
  } else if (lang === 'cpp' || lang === 'c++') {
    compiler = 'gcc-13.2.0';
  }

  const codes = [];
  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.path && f.content && !f.is_directory && f.path !== 'main.c' && f.path !== 'main.py' && f.path !== 'c.c') {
        codes.push({
          file: f.path,
          code: f.content
        });
      }
    }
  }

  const payload = {
    compiler,
    code,
    stdin: stdin || '',
    codes: codes.length > 0 ? codes : undefined
  };

  // Allow up to 30 seconds for remote cloud compilation over public internet
  const CLOUD_TIMEOUT_MS = Math.max(config.executionTimeoutMs || 10000, 30000);

  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CLOUD_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`Cloud compiler service HTTP ${response.status}`);
    }

    const data = await response.json();
    const durationMs = Date.now() - startTime;
    const exitCode = parseInt(data.status || '0', 10);
    const stdout = data.program_output || data.compiler_output || '';
    const rawStderr = (data.compiler_error ? data.compiler_error + '\n' : '') + (data.program_error || '');
    const problems = extractProblems(rawStderr, stdout, language);

    return {
      success: exitCode === 0 && !rawStderr.includes('error:'),
      stdout,
      stderr: rawStderr,
      exitCode,
      durationMs,
      problems,
      engine: 'cloud-wandbox'
    };
  } catch (err) {
    return {
      success: false,
      stdout: '',
      stderr: `Execution error (Cloud Fallback): ${err.message}`,
      exitCode: 1,
      durationMs: Date.now() - startTime,
      problems: []
    };
  }
}

/**
 * Safely executes code in a bounded subprocess with timeouts, quotas, and stdin support
 * Automatically uses native compilers if available; seamlessly falls back to Wandbox Cloud Engine.
 */
export async function executeCode({ language, code, stdin = '', files = [] }) {
  const startTime = Date.now();
  const id = uuidv4().slice(0, 8);
  const lang = (language || 'javascript').toLowerCase();

  // If C or C++, check for native GCC. If absent, execute immediately via Wandbox Cloud Engine
  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    const nativeGcc = detectGccCommand();
    if (!nativeGcc) {
      return await executeViaWandbox({ language: lang, code, stdin, files });
    }
  }

  // If Python, check for native Python. If absent, execute immediately via Wandbox Cloud Engine
  if (lang === 'python' || lang === 'py') {
    const nativePy = detectPythonCommand();
    if (!nativePy) {
      return await executeViaWandbox({ language: 'python', code, stdin, files });
    }
  }

  return new Promise((resolve) => {
    let command = '';
    let args = [];
    let tempFilePath = null;
    let extraCleanup = [];

    try {
      // Sync all workspace files into runner directory so code can read/open files
      if (Array.isArray(files) && files.length > 0) {
        for (const file of files) {
          if (file && file.path) {
            try {
              const destPath = join(RUNNER_DIR, file.path);
              const isDir = Boolean(file.is_directory || file.isDirectory);
              if (isDir) {
                if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
              } else if (typeof file.content === 'string') {
                const destDir = dirname(destPath);
                if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
                if (existsSync(destPath) && statSync(destPath).isDirectory()) {
                  continue;
                }
                writeFileSync(destPath, file.content, 'utf-8');
              }
            } catch (e) {
              console.warn('[Runner File Sync Warning]', e.message);
            }
          }
        }
      }

      if (lang === 'python' || lang === 'py') {
        tempFilePath = join(RUNNER_DIR, `run_${id}.py`);
        writeFileSync(tempFilePath, code, 'utf-8');
        try { writeFileSync(join(RUNNER_DIR, 'main.py'), code, 'utf-8'); } catch (e) {}
        const pyInfo = detectPythonCommand();
        command = pyInfo ? pyInfo.command : (process.platform === 'win32' ? 'python' : 'python3');
        args = ['-u', tempFilePath];
      } else if (lang === 'javascript' || lang === 'node' || lang === 'js') {
        tempFilePath = join(RUNNER_DIR, `run_${id}.js`);
        writeFileSync(tempFilePath, code, 'utf-8');
        command = 'node';
        args = ['--max-old-space-size=64', tempFilePath];
      } else if (lang === 'c') {
        tempFilePath = join(RUNNER_DIR, `run_${id}.c`);
        const outBin = join(RUNNER_DIR, `run_${id}${process.platform === 'win32' ? '.exe' : '.out'}`);
        writeFileSync(tempFilePath, code, 'utf-8');
        extraCleanup.push(outBin);

        // Find auxiliary .c files in workspace for true multi-file C project support
        const otherCFiles = [];
        if (Array.isArray(files)) {
          for (const f of files) {
            if (f && f.path && f.path.endsWith('.c') && f.path !== 'main.c' && !f.path.endsWith(`run_${id}.c`) && !f.is_directory) {
              const fullP = join(RUNNER_DIR, f.path);
              if (existsSync(fullP) && fullP !== tempFilePath && !otherCFiles.includes(fullP)) {
                otherCFiles.push(fullP);
              }
            }
          }
        }

        const gccInfo = detectGccCommand();
        command = gccInfo ? gccInfo.command : 'gcc';
        // Professional compilation flags: C17 standard, optimizations, all warnings, math library, runner header path
        args = ['-std=c17', '-O2', '-Wall', '-Wextra', tempFilePath, ...otherCFiles, '-I', RUNNER_DIR, '-o', outBin, '-lm'];
      } else {
        return resolve({
          success: false,
          stdout: '',
          stderr: `Execution for language '${language}' is not currently configured in the isolated runner.\nMain supported languages: Python, JavaScript, and C.`,
          exitCode: 1,
          durationMs: 0,
          problems: []
        });
      }
    } catch (err) {
      return resolve({
        success: false,
        stdout: '',
        stderr: `Failed to prepare execution environment: ${err.message}`,
        exitCode: 1,
        durationMs: 0,
        problems: []
      });
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let proc = null;

    try {
      proc = spawn(command, args, {
        cwd: RUNNER_DIR,
        timeout: config.executionTimeoutMs,
        env: {
          PATH: process.env.PATH,
          PYTHONUNBUFFERED: '1',
          NODE_ENV: 'sandbox'
        }
      });
    } catch (err) {
      cleanup();
      // If native spawn fails with ENOENT for C or Python, fallback to Wandbox!
      if (lang === 'c' || lang === 'python' || lang === 'py') {
        return executeViaWandbox({ language: lang, code, stdin, files }).then(resolve);
      }
      return resolve({
        success: false,
        stdout: '',
        stderr: `Runner command '${command}' is not available on this host environment: ${err.message}`,
        exitCode: 127,
        durationMs: Date.now() - startTime,
        problems: []
      });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      if (proc && !proc.killed) {
        try {
          proc.kill('SIGKILL');
        } catch (e) {}
      }
    }, config.executionTimeoutMs);

    if (proc.stdin) {
      try {
        if (stdin) {
          proc.stdin.write(stdin);
        }
        proc.stdin.end();
      } catch (e) {}
    }

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < config.maxOutputBufferBytes) {
        stdout += chunk.toString();
      }
    });

    proc.stderr.on('data', (chunk) => {
      if (stderr.length < config.maxOutputBufferBytes) {
        stderr += chunk.toString();
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      cleanup();
      // On spawn error (e.g. ENOENT), fall back to Wandbox for C or Python
      if (lang === 'c' || lang === 'python' || lang === 'py') {
        return executeViaWandbox({ language: lang, code, stdin, files }).then(resolve);
      }
      resolve({
        success: false,
        stdout,
        stderr: stderr || `Process execution failed: ${err.message}. Ensure '${command}' is installed.`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
        problems: extractProblems(stderr + '\n' + err.message, stdout, lang)
      });
    });

    proc.on('close', (code) => {
      clearTimeout(timer);

      // Special case: if this was C compilation and it succeeded, run the compiled binary!
      if (lang === 'c' && code === 0 && extraCleanup[0]) {
        const binPath = extraCleanup[0];
        const compilerWarnings = stderr;
        let runStdout = '';
        let runStderr = '';

        try {
          const runProc = spawn(binPath, [], {
            cwd: RUNNER_DIR,
            timeout: config.executionTimeoutMs,
            env: { ...process.env, PATH: process.env.PATH }
          });

          if (runProc.stdin) {
            try {
              if (stdin) {
                runProc.stdin.write(stdin);
              }
              runProc.stdin.end();
            } catch (e) {}
          }

          runProc.stdout.on('data', (d) => { runStdout += d.toString(); });
          runProc.stderr.on('data', (d) => { runStderr += d.toString(); });

          runProc.on('close', (runCode) => {
            cleanup();
            resolve({
              success: runCode === 0,
              stdout: runStdout,
              stderr: runStderr || (compilerWarnings && compilerWarnings.includes('warning:') ? `[Compiler Warnings]\n${compilerWarnings}` : ''),
              compilerOutput: compilerWarnings || '',
              exitCode: runCode ?? 0,
              durationMs: Date.now() - startTime,
              command: 'gcc -std=c17 -O2 main.c -lm && ./a.out',
              problems: extractProblems((runStderr || '') + '\n' + (compilerWarnings || ''), runStdout, lang)
            });
          });

          runProc.on('error', (err) => {
            cleanup();
            resolve({
              success: false,
              stdout: runStdout,
              stderr: `Execution error: ${err.message}`,
              compilerOutput: compilerWarnings || '',
              exitCode: 1,
              durationMs: Date.now() - startTime,
              problems: []
            });
          });
          return;
        } catch (runErr) {
          cleanup();
          return resolve({
            success: false,
            stdout,
            stderr: `Binary execution error: ${runErr.message}`,
            compilerOutput: compilerWarnings || '',
            exitCode: 1,
            durationMs: Date.now() - startTime,
            problems: []
          });
        }
      }

      // If C compilation failed
      if (lang === 'c' && code !== 0) {
        cleanup();
        const durationMs = Date.now() - startTime;
        return resolve({
          success: false,
          stdout: '',
          stderr: stderr || 'Compilation error: gcc failed to compile source.',
          compilerOutput: stderr || '',
          isCompilationError: true,
          exitCode: code ?? 1,
          durationMs,
          command: 'gcc -std=c17 -O2 main.c -lm',
          problems: extractProblems(stderr, '', lang)
        });
      }

      cleanup();

      if (timedOut) {
        stderr += `\n[Execution Terminated: Maximum timeout of ${config.executionTimeoutMs / 1000} seconds exceeded]`;
      }

      const durationMs = Date.now() - startTime;
      const problems = extractProblems(stderr, stdout, lang);

      resolve({
        success: code === 0 && !timedOut,
        stdout,
        stderr,
        exitCode: timedOut ? 124 : (code ?? 0),
        durationMs,
        command: lang === 'python' || lang === 'py' ? 'python3 -u main.py' : `${command} ${args.join(' ')}`,
        problems
      });
    });

    function cleanup() {
      if (tempFilePath && existsSync(tempFilePath)) {
        try { unlinkSync(tempFilePath); } catch (e) {}
      }
      for (const f of extraCleanup) {
        if (existsSync(f)) {
          try { unlinkSync(f); } catch (e) {}
        }
      }
    }
  });
}

function getGccMissingMessage(errText = '') {
  return `bash: gcc: command not found (${errText || 'compiler binary missing'})

⚠️ GCC compiler is not detected on this local system.
🚀 Cloud Compiler Engine is activated automatically!
• Run 'gcc main.c -o a.out' in terminal or click 'Run Code' to execute instantly.
• For local offline compilation on Windows: 'winget install -e --id MSYS2.MSYS2'
• For Render / Docker deployment: Dockerfile with build-essential is configured.`;
}

/**
 * Checks system availability for GCC, Python, and Node
 * Reports native installation or zero-config cloud compiler readiness
 */
export function checkSystemCompilers() {
  const nativeGcc = detectGccCommand();
  const nativePy = detectPythonCommand();

  return {
    gcc: {
      installed: true,
      nativeInstalled: Boolean(nativeGcc),
      engine: nativeGcc ? 'native' : 'cloud-wandbox',
      version: nativeGcc ? nativeGcc.version : 'GCC 14.2 (Zero-Config Cloud Engine)'
    },
    python: {
      installed: true,
      nativeInstalled: Boolean(nativePy),
      engine: nativePy ? 'native' : 'cloud-wandbox',
      version: nativePy ? nativePy.version : 'Python 3.12 (Zero-Config Cloud Engine)'
    },
    node: {
      installed: true,
      nativeInstalled: true,
      engine: 'native',
      version: process.version
    }
  };
}

/**
 * Executes interactive shell commands against workspace files (gcc, python, ls, cat, etc.)
 */
export async function executeTerminalCommand({ commandLine, roomId = 'default', workspaceFiles = [], stdin = '' }) {
  const startTime = Date.now();
  let trimmed = (commandLine || '').trim();
  if (!trimmed) {
    return {
      command: '',
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0
    };
  }

  let effectiveStdin = stdin || '';

  // 1. Pipe support: echo "input" | command
  if (trimmed.includes('|')) {
    const pipeIdx = trimmed.indexOf('|');
    const left = trimmed.slice(0, pipeIdx).trim();
    const right = trimmed.slice(pipeIdx + 1).trim();
    if (left.startsWith('echo ') || left.startsWith('printf ')) {
      let echoed = left.replace(/^(?:echo|printf)\s+/, '').trim();
      if ((echoed.startsWith('"') && echoed.endsWith('"')) || (echoed.startsWith("'") && echoed.endsWith("'"))) {
        echoed = echoed.slice(1, -1);
      }
      effectiveStdin = echoed + '\n';
      trimmed = right;
    }
  }

  // 2. Here-string support: command <<< "input"
  if (trimmed.includes('<<<')) {
    const parts = trimmed.split('<<<');
    trimmed = parts[0].trim();
    let str = parts[1].trim();
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }
    effectiveStdin = str + '\n';
  }

  // 3. File redirection support: command < file.txt
  if (trimmed.includes(' < ')) {
    const parts = trimmed.split(' < ');
    trimmed = parts[0].trim();
    const fileName = parts[1].trim().replace(/^["']|["']$/g, '');
    const foundFile = workspaceFiles.find((f) => f.path === fileName || f.path.endsWith('/' + fileName));
    if (foundFile && foundFile.content) {
      effectiveStdin = foundFile.content;
    }
  }

  // Parse command and args
  const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const rawParts = parts.map((p) => p.replace(/^["']|["']$/g, ''));
  const cmd = rawParts[0];
  const args = rawParts.slice(1);

  // Dedicated room workspace runner directory
  const roomRunnerDir = join(RUNNER_DIR, `room_${roomId.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
  if (!existsSync(roomRunnerDir)) {
    mkdirSync(roomRunnerDir, { recursive: true });
  }

  // Synchronize workspace files into roomRunnerDir
  for (const f of workspaceFiles) {
    if (f && f.path) {
      const targetPath = join(roomRunnerDir, f.path);
      const isDir = Boolean(f.is_directory || f.isDirectory);
      if (isDir) {
        if (!existsSync(targetPath)) mkdirSync(targetPath, { recursive: true });
      } else if (typeof f.content === 'string') {
        const dir = dirname(targetPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        if (existsSync(targetPath) && statSync(targetPath).isDirectory()) {
          continue;
        }
        try {
          writeFileSync(targetPath, f.content, 'utf-8');
        } catch (e) {
          console.warn('[Terminal File Sync Warning]', e.message);
        }
      }
    }
  }

  // Built-in commands
  if (cmd === 'clear' || cmd === 'cls') {
    return {
      command: trimmed,
      stdout: '\x1bc',
      stderr: '',
      exitCode: 0,
      durationMs: 0
    };
  }

  if (cmd === 'help') {
    const helpText = `L2gether Terminal CLI - Available Commands:
  • gcc <file.c> [-o <out>]   Compile C source file (e.g. gcc main.c -o a.out)
  • ./a.out or a.out          Run compiled C binary
  • python <file.py>          Execute Python script (e.g. python main.py)
  • node <file.js>            Execute Node.js script (e.g. node index.js)
  • ls or dir                 List all files in current workspace
  • cat <file>                View contents of a file
  • clear                     Clear terminal screen
  • help                      Show this help reference

💡 Online Publishing Tip:
Ensure gcc and python3 are installed in your server environment or Docker container for online execution.`;
    return {
      command: trimmed,
      stdout: helpText,
      stderr: '',
      exitCode: 0,
      durationMs: 0
    };
  }

  if (cmd === 'ls' || cmd === 'dir') {
    if (workspaceFiles.length === 0) {
      return {
        command: trimmed,
        stdout: '(workspace is empty)',
        stderr: '',
        exitCode: 0,
        durationMs: Date.now() - startTime
      };
    }
    const lines = workspaceFiles.map((f) => {
      const bytes = (f.content || '').length;
      return `  -rw-r--r--  ${bytes.toString().padStart(6, ' ')} bytes  ${f.path}`;
    });
    return {
      command: trimmed,
      stdout: `total ${workspaceFiles.length} files:\n${lines.join('\n')}`,
      stderr: '',
      exitCode: 0,
      durationMs: Date.now() - startTime
    };
  }

  if (cmd === 'cat' || cmd === 'type') {
    const targetFile = args[0];
    if (!targetFile) {
      return {
        command: trimmed,
        stdout: '',
        stderr: 'usage: cat <filename>',
        exitCode: 1,
        durationMs: 0
      };
    }
    const found = workspaceFiles.find((f) => f.path === targetFile || f.path.endsWith('/' + targetFile));
    if (!found) {
      return {
        command: trimmed,
        stdout: '',
        stderr: `cat: ${targetFile}: No such file or directory`,
        exitCode: 1,
        durationMs: 0
      };
    }
    return {
      command: trimmed,
      stdout: found.content || '',
      stderr: '',
      exitCode: 0,
      durationMs: Date.now() - startTime
    };
  }

  // Handle binary execution: ./a.out or ./a.exe or a.out
  const isBinaryRun = cmd === './a.out' || cmd === 'a.out' || cmd === './a.exe' || cmd === 'a.exe' || cmd.startsWith('./');
  if (isBinaryRun) {
    let binName = cmd.replace(/^\.\//, '');
    let binPath = join(roomRunnerDir, binName);
    const runnerMetaPath = join(roomRunnerDir, `${binName}.runner.json`);

    if (!existsSync(binPath) && process.platform === 'win32' && !binName.endsWith('.exe')) {
      if (existsSync(binPath + '.exe')) {
        binPath += '.exe';
        binName += '.exe';
      }
    }

    // Check if real native executable binary exists on disk (not a virtual placeholder)
    let isRealNativeBinary = existsSync(binPath);
    if (isRealNativeBinary) {
      try {
        const header = readFileSync(binPath, { encoding: 'utf-8', flag: 'r' }).slice(0, 30);
        if (header.startsWith('#!/virtual-binary')) {
          isRealNativeBinary = false;
        }
      } catch (e) {
        // Real compiled binary with binary characters
        isRealNativeBinary = true;
      }
    }

    // Check if binary was compiled via Zero-Config Cloud Engine
    if (!isRealNativeBinary && existsSync(runnerMetaPath)) {
      try {
        const meta = JSON.parse(readFileSync(runnerMetaPath, 'utf-8'));
        const effectiveStdinResolved = effectiveStdin || (args.length > 0 ? args.join('\n') + '\n' : '');
        const wandboxResult = await executeViaWandbox({
          language: meta.language || 'c',
          code: meta.code || '',
          stdin: effectiveStdinResolved,
          files: workspaceFiles
        });
        return {
          command: trimmed,
          stdout: wandboxResult.stdout,
          stderr: wandboxResult.stderr,
          exitCode: wandboxResult.exitCode,
          durationMs: wandboxResult.durationMs
        };
      } catch (e) {
        console.warn('[Runner Meta Execution Warning]', e.message);
      }
    }

    if (!existsSync(binPath)) {
      const cFile = workspaceFiles.find((f) => f.path && f.path.endsWith('.c'));
      return {
        command: trimmed,
        stdout: '',
        stderr: `bash: ${cmd}: No such file or directory\n💡 Tip: Did you compile first? Run: gcc ${cFile ? cFile.path : 'main.c'} -o a.out`,
        exitCode: 127,
        durationMs: Date.now() - startTime
      };
    }

    return new Promise((resolve) => {
      let proc;
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      try {
        proc = spawn(binPath, args, {
          cwd: roomRunnerDir,
          timeout: config.executionTimeoutMs
        });
      } catch (err) {
        return resolve({
          command: trimmed,
          stdout: '',
          stderr: `Execution failed: ${err.message}`,
          exitCode: 1,
          durationMs: Date.now() - startTime
        });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        if (proc && !proc.killed) {
          try { proc.kill('SIGKILL'); } catch (e) {}
        }
      }, config.executionTimeoutMs);

      if (proc.stdin) {
        try {
          const stdinToWrite = effectiveStdin || (args.length > 0 ? args.join('\n') + '\n' : '');
          if (stdinToWrite) {
            proc.stdin.write(stdinToWrite);
          }
          proc.stdin.end();
        } catch (e) {}
      }

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          command: trimmed,
          stdout,
          stderr: timedOut ? stderr + `\n[Terminated: Timeout exceeded]` : stderr,
          exitCode: timedOut ? 124 : (code ?? 0),
          durationMs: Date.now() - startTime
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          command: trimmed,
          stdout,
          stderr: `Process error: ${err.message}`,
          exitCode: 1,
          durationMs: Date.now() - startTime
        });
      });
    });
  }

  // Handle gcc compilation
  if (cmd === 'gcc' || cmd === 'clang') {
    let execArgs = [...args];
    const outputSpecified = execArgs.includes('-o');
    let outTarget = 'a.out';
    if (!outputSpecified) {
      outTarget = process.platform === 'win32' ? 'a.exe' : 'a.out';
      execArgs.push('-o', outTarget);
    } else {
      outTarget = execArgs[execArgs.indexOf('-o') + 1] || 'a.out';
    }

    // Identify target C source file
    const cSourceArg = execArgs.find((a) => a.endsWith('.c')) || 'main.c';
    let cSourceContent = '';
    const foundFile = workspaceFiles.find((f) => f.path === cSourceArg || f.path.endsWith('/' + cSourceArg));
    if (foundFile) {
      cSourceContent = foundFile.content;
    } else {
      const localFilePath = join(roomRunnerDir, cSourceArg);
      if (existsSync(localFilePath)) {
        try { cSourceContent = readFileSync(localFilePath, 'utf-8'); } catch (e) {}
      }
    }

    const nativeGcc = detectGccCommand();
    // If native GCC is not available, use Cloud Wandbox compiler
    if (!nativeGcc) {
      if (!cSourceContent) {
        return {
          command: trimmed,
          stdout: '',
          stderr: `gcc: error: ${cSourceArg}: No such file or directory\ngcc: fatal error: no input files`,
          exitCode: 1,
          durationMs: Date.now() - startTime
        };
      }

      const wandboxResult = await executeViaWandbox({
        language: 'c',
        code: cSourceContent,
        stdin: '',
        files: workspaceFiles
      });

      if (!wandboxResult.success && wandboxResult.stderr.includes('error:')) {
        return {
          command: trimmed,
          stdout: wandboxResult.stdout,
          stderr: wandboxResult.stderr,
          exitCode: wandboxResult.exitCode || 1,
          durationMs: wandboxResult.durationMs
        };
      }

      // Save virtual runner state for the output binary
      const runnerMetaPath = join(roomRunnerDir, `${outTarget}.runner.json`);
      try {
        writeFileSync(runnerMetaPath, JSON.stringify({
          language: 'c',
          code: cSourceContent,
          outName: outTarget
        }), 'utf-8');
        // Touch binary file so ls / checks detect it
        writeFileSync(join(roomRunnerDir, outTarget), '#!/virtual-binary\n', 'utf-8');
      } catch (e) {}

      return {
        command: trimmed,
        stdout: `Compilation successful! Binary created: ./${outTarget}\nRun now with: ./${outTarget} (Powered by Zero-Config Cloud Engine)`,
        stderr: wandboxResult.stderr ? `Warnings:\n${wandboxResult.stderr}` : '',
        exitCode: 0,
        durationMs: wandboxResult.durationMs
      };
    }

    return new Promise((resolve) => {
      let proc;
      let stdout = '';
      let stderr = '';

      try {
        proc = spawn(cmd, execArgs, {
          cwd: roomRunnerDir,
          timeout: config.executionTimeoutMs,
          env: { ...process.env, PATH: process.env.PATH }
        });
      } catch (err) {
        return resolve({
          command: trimmed,
          stdout: '',
          stderr: getGccMissingMessage(err.message),
          exitCode: 127,
          durationMs: Date.now() - startTime
        });
      }

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('error', (err) => {
        resolve({
          command: trimmed,
          stdout,
          stderr: getGccMissingMessage(err.message),
          exitCode: 127,
          durationMs: Date.now() - startTime
        });
      });

      proc.on('close', (code) => {
        const outName = outputSpecified ? execArgs[execArgs.indexOf('-o') + 1] : (process.platform === 'win32' ? 'a.exe' : 'a.out');
        if (code === 0 && !stderr) {
          stdout = `Compilation successful! Binary created: ./${outName}\nRun now with: ./${outName}`;
        }
        resolve({
          command: trimmed,
          stdout,
          stderr,
          exitCode: code ?? 0,
          durationMs: Date.now() - startTime
        });
      });
    });
  }

  // Handle Python execution: python or python3
  if (cmd === 'python' || cmd === 'python3' || cmd === 'py') {
    const pyInfo = detectPythonCommand();

    // If native python is missing, run via Wandbox Cloud Engine
    if (!pyInfo) {
      const scriptArg = args.find((a) => a.endsWith('.py')) || 'main.py';
      let pyContent = '';
      const foundFile = workspaceFiles.find((f) => f.path === scriptArg || f.path.endsWith('/' + scriptArg));
      if (foundFile) {
        pyContent = foundFile.content;
      } else {
        const localFilePath = join(roomRunnerDir, scriptArg);
        if (existsSync(localFilePath)) {
          try { pyContent = readFileSync(localFilePath, 'utf-8'); } catch (e) {}
        }
      }

      if (!pyContent) {
        return {
          command: trimmed,
          stdout: '',
          stderr: `python: can't open file '${scriptArg}': [Errno 2] No such file or directory`,
          exitCode: 2,
          durationMs: Date.now() - startTime
        };
      }

      const pythonArgs = args.filter((a) => a !== scriptArg);
      const pythonStdin = effectiveStdin || (pythonArgs.length > 0 ? pythonArgs.join('\n') + '\n' : '');
      const wandboxResult = await executeViaWandbox({
        language: 'python',
        code: pyContent,
        stdin: pythonStdin,
        files: workspaceFiles
      });

      return {
        command: trimmed,
        stdout: wandboxResult.stdout,
        stderr: wandboxResult.stderr,
        exitCode: wandboxResult.exitCode,
        durationMs: wandboxResult.durationMs
      };
    }

    const pythonBin = pyInfo.command;
    return new Promise((resolve) => {
      let proc;
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      try {
        proc = spawn(pythonBin, ['-u', ...args], {
          cwd: roomRunnerDir,
          timeout: config.executionTimeoutMs,
          env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });
      } catch (err) {
        return resolve({
          command: trimmed,
          stdout: '',
          stderr: `Python execution failed: ${err.message}. Ensure Python 3 is installed.`,
          exitCode: 127,
          durationMs: Date.now() - startTime
        });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        if (proc && !proc.killed) {
          try { proc.kill('SIGKILL'); } catch (e) {}
        }
      }, config.executionTimeoutMs);

      if (proc.stdin) {
        try {
          const pythonArgs = args.filter((a) => !a.endsWith('.py'));
          const stdinToWrite = effectiveStdin || (pythonArgs.length > 0 ? pythonArgs.join('\n') + '\n' : '');
          if (stdinToWrite) {
            proc.stdin.write(stdinToWrite);
          }
          proc.stdin.end();
        } catch (e) {}
      }

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          command: trimmed,
          stdout,
          stderr: `Python not found or failed to start: ${err.message}`,
          exitCode: 127,
          durationMs: Date.now() - startTime
        });
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          command: trimmed,
          stdout,
          stderr: timedOut ? stderr + `\n[Terminated: Timeout exceeded]` : stderr,
          exitCode: timedOut ? 124 : (code ?? 0),
          durationMs: Date.now() - startTime
        });
      });
    });
  }

  // Handle node execution
  if (cmd === 'node') {
    return new Promise((resolve) => {
      let proc;
      let stdout = '';
      let stderr = '';

      try {
        proc = spawn('node', args, {
          cwd: roomRunnerDir,
          timeout: config.executionTimeoutMs
        });
      } catch (err) {
        return resolve({
          command: trimmed,
          stdout: '',
          stderr: `Node execution failed: ${err.message}`,
          exitCode: 127,
          durationMs: Date.now() - startTime
        });
      }

      if (proc.stdin) {
        try {
          if (effectiveStdin) {
            proc.stdin.write(effectiveStdin);
          }
          proc.stdin.end();
        } catch (e) {}
      }

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        resolve({
          command: trimmed,
          stdout,
          stderr,
          exitCode: code ?? 0,
          durationMs: Date.now() - startTime
        });
      });
    });
  }

  // Fallback for unknown commands
  return {
    command: trimmed,
    stdout: '',
    stderr: `bash: ${cmd}: command not recognized in sandbox environment.\nSupported commands: gcc, ./a.out, python, node, ls, cat, clear, help`,
    exitCode: 127,
    durationMs: Date.now() - startTime
  };
}

/**
 * Automated Test Case Runner
 * Executes code against multiple input test cases, comparing expected output vs actual output
 */
export async function executeTestCases({ language, code, testCases = [], files = [] }) {
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const input = tc.input !== undefined && tc.input !== null ? String(tc.input) : '';
    const expected = (tc.expectedOutput !== undefined && tc.expectedOutput !== null ? String(tc.expectedOutput) : '').trim();
    const runRes = await executeCode({
      language,
      code,
      stdin: input,
      files
    });
    const actual = (runRes.stdout || '').trim();
    const passed = runRes.success && runRes.exitCode === 0 && actual === expected;
    let status = 'Passed';
    if (!runRes.success || runRes.exitCode !== 0) {
      status = 'Runtime Error';
    } else if (actual !== expected) {
      status = 'Wrong Answer';
    }
    results.push({
      id: tc.id || `tc_${i + 1}`,
      title: tc.title || `Test Case #${i + 1}`,
      input,
      expectedOutput: tc.expectedOutput || '',
      actualOutput: runRes.stdout || '',
      stderr: runRes.stderr || '',
      passed,
      status,
      exitCode: runRes.exitCode,
      durationMs: runRes.durationMs
    });
  }
  return {
    total: testCases.length,
    passedCount: results.filter((r) => r.passed).length,
    allPassed: results.length > 0 && results.every((r) => r.passed),
    results
  };
}

export default { executeCode, extractProblems, executeTerminalCommand, checkSystemCompilers, executeTestCases };
