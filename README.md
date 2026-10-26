# L2gether — One link. Everything together.

> **A modern, temporary collaborative workspace where people connect via a room link or QR code and work together without mandatory account registration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Monaco Editor](https://img.shields.io/badge/Monaco%20Editor-VS%20Code%20Engine-purple.svg)](https://microsoft.github.io/monaco-editor/)
[![Tests](https://img.shields.io/badge/Tests-19%20Passing-brightgreen.svg)]()

---

## 1. Project Overview

**L2gether** combines the power of a collaborative workspace, a lightweight online IDE, and an ephemeral community space. It is designed for hackathons, pair programming, algorithmic problem solving, interviews, and rapid prototyping.

### Key Capabilities

- **Guest Access without Mandatory Accounts:** Enter a display name and immediately create or join workspaces. No email or phone verification friction.
- **Host Room & Creator Control Architecture:**
  - **Option A (Join):** Participants enter Room ID/link + display name. No owner password required. Public rooms admit immediately; private rooms submit pending requests to the host.
  - **Option B (Host Room):** Room creators can create a new room (setting an owner password) or manage an existing room.
  - **Salted Scrypt Password Hashing & High-Entropy Recovery Key:** The server hashes creator passwords using salted scrypt with `crypto.timingSafeEqual`. In addition, creators receive a unique 16-character emergency recovery key (`L2G-XXXX-XXXX-XXXX-XXXX`).
  - **Offline Host Support:** Join requests for private rooms persist in the database even if the creator closes their browser or shuts down their device. When the creator returns and authenticates via password or recovery key, they can review and approve all pending requests.
- **Strict 7-Day Ephemeral Retention:** Every room automatically calculates `expires_at = created_at + 7 days`. An automated background worker reconciles and purges expired rooms, chat histories, workspaces, and shared files.
- **Monaco Code Editor:** Powered by VS Code's core editing engine with syntax highlighting, line numbers, automatic bracket/quote matching, code folding, and VS Code keyboard shortcuts (`Ctrl+S`, `Ctrl+P`, `Ctrl+Shift+P`, `Ctrl+/`, etc.).
- **Universal Template Picker (`Shift + !`):** Press `Shift + !` anywhere to open the starter template picker covering 17+ languages (HTML5, CSS, JS, React JSX, TS, Python, C, C++, Java, C#, PHP, SQL, Bash, Go, Rust, JSON, Markdown).
- **Emmet & Smart Snippets:** Expand Emmet abbreviations (`h1`, `p`, `div`, `button`, `ul>li*3`, `div.container`, `!`) and use language-specific shortcuts (`pri` -> `console.log()` / `printf` / `print()` / `std::cout`).
- **Multi-File Project Explorer:** Create files, folders, rename, delete, expand/collapse, upload files, and export/import projects as standard `.zip` archives.
- **Isolated Code Execution:** Run Python, JavaScript, C, and C++ in bounded, restricted sandbox subprocesses with timeouts (10s), buffer quotas (64KB), and interactive standard input (`stdin`) stream support.
- **Problems Diagnostics Panel:** Structured compiler and runtime error parsing (file, line, column, severity) with clickable jumps straight to the source code.
- **Live Web Preview:** Sandboxed iframe with responsive viewport switcher (Desktop 100%, Tablet 768px, Mobile 375px), auto-refresh, manual refresh, and an in-preview Web Console logger.
- **Real-Time Room Chat:** Socket.IO messaging with syntax-highlighted code snippets, copy code buttons, search filter, and `@username` / `@all` mention auto-complete.
- **Shared File Storage:** Private room file uploads with drag-and-drop, secure download links, and automatic cleanup at expiration.
- **Smart Package Manager:** Searchable catalog for NPM packages, Python libraries, and CDN frameworks (Tailwind, Bootstrap, FontAwesome, Three.js, Chart.js) with instant HTML injection.
- **WebRTC Audio Calls:** Group audio-only peer mesh with Socket.IO signaling, mute/unmute toggles, and animated volume speaking ring indicators.
- **Adaptive Design System:** Curated Dark Mode, Light Mode, and System Default themes with zero visual flashing and instant Monaco editor synchronization.
- **QR Code Sharing:** Generate and scan room QR codes for instant mobile device pairing.


---

## 2. Architecture & Technology Stack

```
L2gether/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment & configuration tokens
│   │   ├── database/           # Dual PostgreSQL & SQLite adapter + schema.sql
│   │   ├── middleware/         # Auth, upload limits, rate limiter, errors
│   │   ├── routes/             # Rooms, chat, files, workspaces, execution, packages
│   │   ├── services/           # Room lifecycle, execution sandboxing, packages
│   │   ├── sockets/            # Socket.IO (chat, presence, cursors, WebRTC audio signaling)
│   │   ├── workers/            # Scheduled 7-day room expiration cleanup worker
│   │   ├── app.js              # Express app & security middleware
│   │   └── server.js           # HTTP + Socket.IO server bootstrap
│   └── tests/                  # Automated unit & integration tests (19 passing)
├── frontend/
│   ├── src/
│   │   ├── components/         # Nav, RoomHeader, Explorer, Editor, Preview, Chat, Audio
│   │   ├── contexts/           # Theme (Dark/Light/System), Auth (Guest session), AudioCall (WebRTC)
│   │   ├── pages/              # Home, CreateRoom, JoinRoom, RoomWorkspace, RoomExpired, Privacy
│   │   ├── services/           # API client & Socket.IO client
│   │   ├── styles/             # Design system CSS tokens, layout, editor, chat
│   │   └── utils/              # 17+ Language templates, Emmet expansions, snippets
│   └── index.html
└── package.json                # Root concurrently dev scripts
```

---

## 3. Quickstart & Local Development

### Prerequisites
- Node.js v20.0.0 or higher
- npm v9.0.0 or higher
- (Optional) Python 3.x and GCC/G++ for local code execution runner

### Step 1: Clone and Install
```bash
# Clone the repository
git clone <repo-url>
cd L2gether

# Install root, backend, and frontend dependencies in one command
npm run install:all
```

### Step 2: Start Development Servers
```bash
# Concurrently starts Backend on http://localhost:5000 and Frontend on http://localhost:5173
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## 4. Database Setup & Configuration

L2gether ships with an intelligent database access layer (`backend/src/database/db.js`):

### Option A: Embedded Zero-Config SQLite (Default)
If `DATABASE_URL` is empty, L2gether automatically uses Node.js 24's native high-performance SQLite engine (`backend/storage/l2gether.db`). Zero external database services are required to run or test locally.

### Option B: PostgreSQL Production Database
To use PostgreSQL, specify `DATABASE_URL` in `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/l2gether
```
Run database migrations:
```bash
cd backend
npm run migrate
```
The full relational schema with foreign keys, indexes, and triggers is located at [`backend/src/database/schema.sql`](file:///c:/Users/Saurav/OneDrive/Desktop/L2gether/backend/src/database/schema.sql).

---

## 5. Automated Tests

L2gether includes a comprehensive test suite covering backend logic, 7-day expiration reconciliation, guest sessions, sandboxed execution, real-time Socket.IO chat, collaborative code broadcasting, and WebRTC audio signaling:

```bash
cd backend
npm test
```

Result: **19 tests passed, 0 failures**.

---

## 6. Production Deployment Guide

### Environment Variables
Copy `.env.example` to `.env` and configure:
```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-l2gether-domain.com
DATABASE_URL=postgresql://user:password@host:5432/l2gether
SESSION_SECRET=your-secure-random-32-char-secret
UPLOAD_DIR=./storage/uploads
MAX_FILE_SIZE_MB=25
EXECUTION_TIMEOUT_MS=10000
ROOM_EXPIRY_DAYS=7
CLEANUP_INTERVAL_MINUTES=30
```

### Production Build
```bash
# Build optimized frontend bundle
npm run build:frontend

# Start production server
npm start
```

### Health Check Endpoint
- URL: `GET /health`
- Response:
```json
{
  "status": "healthy",
  "app": "L2gether",
  "version": "1.0.0",
  "timestamp": "2026-10-24T17:38:13.251Z"
}
```

---

## 7. License

MIT License. Designed and engineered for high-velocity developer collaboration.
