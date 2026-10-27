<div align="center">

# ⚡ L2gether
### *One link. Everything together.*

A modern, high-velocity collaborative workspace designed for hackathons, pair programming, algorithmic challenges, and rapid prototyping — with **zero mandatory account registration**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v22%2B%20LTS-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Monaco Editor](https://img.shields.io/badge/Monaco%20Editor-VS%20Code%20Engine-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)](https://microsoft.github.io/monaco-editor/)
[![Tests](https://img.shields.io/badge/Automated%20Tests-41%20Passing-brightgreen.svg?style=flat-square)]()

[Explore Features](#-key-features) • [Why L2gether](#-why-l2gether-advantages) • [Screenshots](#-screenshots--demo) • [System Flow](#-architecture--flow-diagrams) • [Quickstart](#-quickstart--installation) • [Futuristic Roadmap](#-futuristic-roadmap) • [Deployment](#-cloud-deployment)

---

</div>

## 📌 Table of Contents
- [About L2gether](#-about-l2gether)
- [Screenshots & Demo](#-screenshots--demo)
- [Why L2gether? (Advantages)](#-why-l2gether-advantages)
- [Key Features](#-key-features)
- [Architecture & Flow Diagrams](#-architecture--flow-diagrams)
- [Futuristic Roadmap](#-futuristic-roadmap) *(Upcoming C & Python Compiler)*
- [Quickstart & Installation](#-quickstart--installation)
- [Database Setup (Zero-Config SQLite vs PostgreSQL)](#-database-setup)
- [Automated Testing](#-automated-testing)
- [Cloud Deployment](#-cloud-deployment)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Project Structure](#-project-structure)
- [Author & License](#-author--license)

---

## 💡 About L2gether

**L2gether** eliminates the traditional setup friction in developer collaboration. Instead of forcing users to sign up with emails, configure remote servers, or juggle three different apps for code, voice, and chat, L2gether creates a **complete temporary studio via a single shareable link or QR code**.

Whether you're running a quick pair-programming interview, debugging with a colleague, testing web layouts, or teaching an algorithm in a workshop, L2gether delivers an instant, synchronized development environment that automatically cleans up after itself.

---

## 📸 Screenshots & Demo

<table align="center" width="100%">
  <tr>
    <td width="50%" align="center">
      <h4>1. Host Portal & Room Security Setup</h4>
      <a href="assets/screenshots/1-host-room.png" target="_blank">
        <img src="assets/screenshots/1-host-room.png" alt="Host Portal and Room Security" width="100%"/>
      </a>
      <p><em>Instant room creation with salted scrypt password hashing, private room approval mode, capacity limits, and starter templates.</em></p>
    </td>
    <td width="50%" align="center">
      <h4>2. Monaco Workspace & Interactive Split Preview</h4>
      <a href="assets/screenshots/2-code-and-preview.png" target="_blank">
        <img src="assets/screenshots/2-code-and-preview.png" alt="Monaco Workspace and Split Preview" width="100%"/>
      </a>
      <p><em>Full-featured VS Code editing engine, multi-file project explorer, Emmet expansions, and live side-by-side 3D WebGL / HTML rendering.</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <h4>3. Full-Screen Responsive Web Preview</h4>
      <a href="assets/screenshots/3-live-preview.png" target="_blank">
        <img src="assets/screenshots/3-live-preview.png" alt="Full-Screen Responsive Web Preview" width="100%"/>
      </a>
      <p><em>Sandboxed canvas rendering with responsive device toggles (Desktop, Tablet, Mobile), auto-refresh, and integrated Web Console logger.</em></p>
    </td>
    <td width="50%" align="center">
      <h4>4. Real-Time Team Chat & Whiteboard Sharing</h4>
      <a href="assets/screenshots/4-chat.png" target="_blank">
        <img src="assets/screenshots/4-chat.png" alt="Real-Time Team Chat and Whiteboard Sharing" width="100%"/>
      </a>
      <p><em>Low-latency Socket.IO room messaging with formatted syntax-highlighted code blocks, one-click copy, and inline shared whiteboard snapshots.</em></p>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <h4>5. Collaborative Whiteboard & WebRTC Voice Calling</h4>
      <a href="assets/screenshots/5-calling-and-whiteboard.png" target="_blank">
        <img src="assets/screenshots/5-calling-and-whiteboard.png" alt="Collaborative Whiteboard and WebRTC Voice Mesh" width="100%"/>
      </a>
      <p><em>Dockable interactive whiteboard with drawing & shape tools, plus peer-to-peer WebRTC voice mesh with live speaking indicator.</em></p>
    </td>
  </tr>
</table>

---

## 🚀 Why L2gether? (Advantages)

| Advantage | Traditional Sandboxes / Tools | L2gether |
| :--- | :--- | :--- |
| **Onboarding Friction** | Mandatory email signup, OAuth, password reset loops | **0-second entry** via room link or QR code with guest display names |
| **Room Longevity & Clutter** | Abandoned workspaces accumulate forever, leaking data | **Strict 7-Day Ephemeral Lifecycle** with automatic database & asset cleanup |
| **Room Host Authority** | Any participant can mess up files or kick others | **Host-controlled private rooms** with salted scrypt hashing & 16-char emergency key |
| **Offline Host Resilience** | Join requests lost when host closes browser | **Persistent database request queue**; hosts review pending joins upon return |
| **All-in-One Synergy** | Code in one tab, call on Zoom/Discord, chat in Slack | **Unified workspace**: Code + Preview + Voice + Chat + File Sharing in one tab |
| **Local Setup Complexity** | Heavy Docker / PostgreSQL prerequisites | **Dual-Engine DB**: Works out of the box with zero-config embedded SQLite |

---

## ✨ Key Features

### 🖥️ 1. Monaco Code Editor (VS Code Engine)
- **Familiar Developer Experience**: Powered by the same core engine as Visual Studio Code. Includes syntax highlighting, code folding, bracket matching, and keybindings (`Ctrl+S`, `Ctrl+P`, `Ctrl+/`).
- **Universal Template Picker (`Shift + !`)**: Instant boilerplate generator for 17+ languages:
  - Web: HTML5, CSS3, JavaScript, React (JSX), TypeScript
  - Systems & Backend: Python, C, C++, Java, C#, Go, Rust, PHP, SQL, Bash, JSON, Markdown
- **Emmet & Intelligent Snippets**: Built-in shortcut expansions (e.g. `ul>li*3`, `div.container`, `pri` -> `console.log()` / `printf` / `print()`).
- **Virtual Project Tree**: Create, rename, delete files/folders, expand/collapse directories, upload local files, and export entire projects as clean `.zip` archives.

### 🌐 2. Live Sandboxed Web Preview
- **Real-Time Rendering**: Automatically compiles and mounts HTML, CSS, and JavaScript inside a secure, sandboxed iframe.
- **Responsive Viewport Controls**: Switch between **Desktop (100%)**, **Tablet (768px)**, and **Mobile (375px)** to inspect layouts instantly.
- **Embedded Web Console**: Intercepts `console.log`, `warn`, and `error` outputs directly inside the preview panel for seamless client-side debugging.

### 🛡️ 3. Host Control & High-Entropy Security
- **Salted Scrypt Hashing**: Room passwords hashed using Node.js crypto scrypt with constant-time equality comparisons (`crypto.timingSafeEqual`) to prevent timing attacks.
- **16-Character Emergency Recovery Key**: Room creators automatically receive an offline recovery key (`L2G-XXXX-XXXX-XXXX-XXXX`) to regain room authority at any time.
- **Offline Approval Queue**: When private rooms receive join requests while the host is disconnected, requests persist in the database and wait for host review upon re-authentication.

### 💬 4. Real-Time Chat & File Hub
- **Socket.IO Real-Time Chat**: Broadcast messages with syntax-highlighted code blocks, one-click copy buttons, message search filter, and `@username` auto-completion.
- **Ephemeral Shared Storage**: Drag-and-drop file uploader (up to 25MB) with secure signed download links. All files are purged automatically upon room expiration.
- **Smart Package Injector**: Searchable library catalog to instantly inject modern CDN scripts (Tailwind CSS, Bootstrap, FontAwesome, Three.js, Chart.js, React).

### 🎙️ 5. Peer-to-Peer WebRTC Voice Mesh
- **Built-In Audio Calling**: Lightweight, serverless voice chat directly between room peers using WebRTC mesh networking.
- **Live Speaking Ring**: Visual audio waves and dynamic ring indicators to highlight who is currently speaking.
- **No Third-Party Voice Apps**: Discuss code changes without needing Discord, Google Meet, or Zoom.

### 🎨 6. Collaborative Whiteboard & System Diagramming
- **Dockable & Floating Canvas**: Flexible placement (Stick Left, Stick Right, Float, Corner, Fit View) for drafting system architecture, data models, or algorithm dry runs.
- **Rich Vector Drawing Toolkit**: Freehand pen, lines, rectangles, ellipses, arrows, text annotations, customizable stroke thickness, and curated color swatches.
- **Instant Chat Broadcast**: Share high-resolution whiteboard snapshots directly into the live room chat with one click for discussion and download.

### 📱 7. QR Code Pairing & Theme Engine
- **Instant Mobile Pairing**: Generate an on-the-fly QR code for mobile browsers to preview web pages or join the room chat.
- **Theme Synchronizer**: Curated Dark, Light, and System themes with zero flash of unstyled content and synchronized Monaco editor themes.

---

## 📊 Architecture & Flow Diagrams

### User Journey & Ephemeral Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Host as Room Creator (Host)
    actor Guest as Collaborator (Guest)
    participant Server as L2gether Server & DB
    participant Worker as 7-Day Purge Worker

    Host->>Server: Create Room (Password + Name)
    Server-->>Host: Room Created + 16-Char Recovery Key (L2G-...)
    Host->>Guest: Share Room Link / QR Code
    
    alt Public Room
        Guest->>Server: Enter Display Name & Join
        Server-->>Guest: Admitted to Workspace
    else Private Room (Approval Mode)
        Guest->>Server: Request Access
        Server->>Server: Store in Pending Queue (Persistent)
        Server->>Host: Notify Pending Request
        Host->>Server: Approve Guest Access
        Server-->>Guest: Grant Token & Admit to Workspace
    end

    loop Active Collaboration (0 to 7 Days)
        Host->>Server: Sync Code / Chat / Files
        Guest->>Server: Sync Code / Chat / Files
        Host<<-->>Guest: Direct WebRTC Audio Mesh
    end

    Note over Server,Worker: Room Reaches expires_at (created_at + 7 days)
    Worker->>Server: Scan for Expired Workspaces
    Worker->>Server: Purge Files, Chats, Code & DB Records
```

### Real-Time System Topology
```mermaid
graph TD
    subgraph Clients ["Collaborative Clients"]
        A["Host Browser"]
        B["Guest Browser A"]
        C["Guest Browser B"]
    end

    subgraph Transport ["Transport Layers"]
        REST["HTTP REST API<br/>(Express 4 / Helmet / RateLimit)"]
        WS["Socket.IO WebSockets<br/>(Room Broadcaster & Signaling)"]
        P2P["WebRTC Audio Mesh<br/>(Peer-to-Peer Voice Streams)"]
    end

    subgraph Backend ["L2gether Backend Architecture"]
        AUTH["Auth & Session Guard"]
        ROOMS["Room & Workspace Manager"]
        STORAGE["Dual DB Adapter<br/>(Native SQLite or PostgreSQL)"]
        FILES["Ephemeral Uploads (/storage)"]
        CLEANUP["Background Expiration Worker<br/>(Runs every 30 mins)"]
    end

    A <-->|REST Requests| REST
    B <-->|REST Requests| REST
    C <-->|REST Requests| REST

    A <-->|Cursor, Chat, Code Sync| WS
    B <-->|Cursor, Chat, Code Sync| WS
    C <-->|Cursor, Chat, Code Sync| WS

    A <-->|Direct Voice Audio| B
    B <-->|Direct Voice Audio| C
    A <-->|Direct Voice Audio| C

    REST --> AUTH
    WS --> AUTH
    AUTH --> ROOMS
    ROOMS --> STORAGE
    ROOMS --> FILES
    CLEANUP --> STORAGE
    CLEANUP --> FILES
```

---

## 🔮 Futuristic Roadmap

We are actively engineering next-generation capabilities to turn L2gether into an unconstrained cloud & in-browser development environment.

### ⚡ Upcoming Milestone: High-Performance C and Python Online Compiler
> **Status:** *In active architecture and development (Targeted for upcoming release)*

Currently, L2gether focuses on client-side and sandboxed web development. Our next major leap introduces full-fledged execution for compiled and interpreted languages:

```
┌────────────────────────────────────────────────────────┐
│             Planned Execution Architecture             │
├──────────────────────────┬─────────────────────────────┤
│ 🐍 Python Runtime        │ ⚙️ C / C++ Toolchain        │
│ • Pyodide / WebAssembly   │ • Clang / GCC WebAssembly   │
│ • Zero-latency in-browser│ • Containerized Micro-Jail  │
│ • Standard library + math│ • POSIX I/O simulation      │
├──────────────────────────┴─────────────────────────────┤
│ 🔄 Interactive Streaming Console                       │
│ • Live interactive standard input (stdin) stream       │
│ • Immediate stdout/stderr piping with colorized errors │
│ • Automated test-case runner (LeetCode/HackerRank style│
│ • Execution bounds: 10s timeout, memory & buffer quotas│
└────────────────────────────────────────────────────────┘
```

#### What this will unlock:
1. **Competitive Programming & Interview Arena**: Run algorithm test suites against C/C++ and Python solutions in real-time with your interviewers.
2. **Interactive Standard Input (stdin)**: Pass input to programs interactively during runtime rather than static pre-execution inputs.
3. **Structured Diagnostics & Linting**: Direct integration with Monaco's diagnostics marker system to underline syntax and compiler errors at the exact line and column.

### 🌟 Additional Planned Innovations
- [ ] **Operational Transformation / CRDT Multi-Cursor**: Concurrent live character-by-character collaborative typing.
- [ ] **AI Pair-Programmer Assistant**: In-editor AI assistant to explain code, generate boilerplate, and fix compiler errors.
- [ ] **Interactive Web Terminal**: Full xterm.js integration for running command scripts inside containerized rooms.
- [ ] **Dark Mode Color Palettes**: Dracula, Catppuccin, Tokyo Night, and GitHub Dark custom theme switcher.

---

## 🛠️ Quickstart & Installation

### Prerequisites
- **Node.js**: `v20.0.0` or higher (`v22+ LTS` recommended)
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured on your system

### Step 1: Clone the Repository
```bash
git clone https://github.com/Aurenox/L2gether.git
cd L2gether
```

### Step 2: Install All Dependencies
L2gether includes a root convenience script that installs dependencies across the root, backend, and frontend concurrently:
```bash
npm run install:all
```

### Step 3: Configure Environment Variables
Copy the sample environment file to the backend:
```bash
cp .env.example backend/.env
```

*(Optional)* Review `backend/.env`. By default, no edits are required for local testing!

### Step 4: Start the Development Environment
Run both backend and frontend servers with a single command:
```bash
npm run dev
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets:** [http://localhost:5000](http://localhost:5000)

---

## 💾 Database Setup

L2gether features a built-in **dual-database abstraction layer** (`backend/src/database/db.js`):

### Option A: Embedded Zero-Config SQLite (Default)
- **No external database installation required.**
- If `DATABASE_URL` is omitted or empty in your `.env`, L2gether automatically spins up an embedded SQLite database using Node.js's native high-performance engine at `backend/storage/l2gether.db`.
- Perfect for instant onboarding, hackathons, and offline testing.

### Option B: PostgreSQL for Production
To connect to an external PostgreSQL database (e.g. Neon, Supabase, Render PostgreSQL):
1. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/l2gether
   ```
2. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```
   The relational schema with automated indexing and cascade foreign keys is in [`backend/src/database/schema.sql`](backend/src/database/schema.sql).

---

## 🧪 Automated Testing

L2gether includes an automated test suite covering guest sessions, room creation, salted password verification, real-time Socket.IO chat, workspace file persistence, and 7-day expiration routines:

```bash
cd backend
npm test
```

```text
✔ Room lifecycle & security tests passed
✔ Salted scrypt key recovery tests passed
✔ Workspace file synchronization tests passed
✔ Socket.IO signaling & chat delivery tests passed
✔ Automated 7-day purge worker tests passed
────────────────────────────────────────────
ℹ tests 41
ℹ pass 41
ℹ fail 0
```

---

## ☁️ Cloud Deployment

L2gether is designed for seamless, cost-effective deployment across modern cloud platforms:

### 1. Deploy Backend (Render / Railway / Fly.io)
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your repository and configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
3. Set Environment Variables:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = *(Generate a secure 32+ character string)*
   - `CLIENT_URL` = `https://your-l2gether-app.vercel.app`
   - *(Optional)* `DATABASE_URL` = *(Your PostgreSQL URL, or leave blank for SQLite)*
4. Click **Deploy Web Service** and copy your backend URL.

### 2. Deploy Frontend (Vercel / Netlify)
1. Import your repository into [Vercel](https://vercel.com).
2. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-l2gether-backend.onrender.com` *(no trailing slash)*
4. Click **Deploy**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Scope | Action |
| :--- | :--- | :--- |
| `Shift + !` | Global Editor | Open Starter Template Picker (17+ languages) |
| `Ctrl + S` / `Cmd + S` | Editor | Save Workspace & Trigger Live Preview Refresh |
| `Ctrl + P` / `Cmd + P` | Editor | Quick File Search & Switcher |
| `Ctrl + /` / `Cmd + /` | Editor | Toggle Line Comment |
| `Ctrl + F` / `Cmd + F` | Editor | Find & Replace in Active File |
| `Tab` / `Shift + Tab` | Editor | Indent / Outdent Code Block |
| `Esc` | Modals | Close Active Modal / Popups |

---

## 📂 Project Structure

```text
L2gether/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment configs & security constants
│   │   ├── database/           # Dual PostgreSQL & SQLite database engine
│   │   ├── middleware/         # Auth verification, rate limiting, error handling
│   │   ├── routes/             # REST API (rooms, chat, files, workspace, packages)
│   │   ├── services/           # Room lifecycle, package catalogs, execution
│   │   ├── sockets/            # Socket.IO (chat, presence, WebRTC audio signaling)
│   │   ├── workers/            # Scheduled 7-day room expiration cleanup worker
│   │   ├── app.js              # Express app setup & middleware
│   │   └── server.js           # HTTP + Socket.IO server entrypoint
│   └── tests/                  # Automated integration & unit test suite
├── frontend/
│   ├── src/
│   │   ├── components/         # Monaco editor, file explorer, chat, preview, audio
│   │   ├── contexts/           # Theme, Auth session, WebRTC audio call context
│   │   ├── pages/              # Home, CreateRoom, JoinRoom, Workspace, Expired
│   │   ├── services/           # REST client & Socket.IO client connections
│   │   ├── styles/             # Modular CSS design system & responsive layout
│   │   └── utils/              # 17+ Language templates, snippets, Emmet expansion
│   └── index.html              # HTML entrypoint
├── .env.example                # Environment variables reference template
├── package.json                # Root scripts (install:all, dev, test)
└── render.yaml                 # Infrastructure-as-code for Render deployment
```

---

## 👤 Author & License

Designed and engineered with passion by **Saurav B**.

- **GitHub:** [@aurenox](https://github.com/aurenox)
- **LinkedIn:** [Saurav B](https://www.linkedin.com/in/saurav-b-a864a7326/)
- **Email:** [saurav04atg@gmail.com](mailto:saurav04atg@gmail.com)

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

<div align="center">
  <sub>Built for developers, by developers. Star ⭐ this repository if you find it helpful!</sub>
</div>
