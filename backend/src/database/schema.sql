-- L2gether PostgreSQL Database Schema
-- Normalized relational schema with 7-day room lifecycle support

-- 1. Guest Sessions
CREATE TABLE IF NOT EXISTS guest_sessions (
    id VARCHAR(64) PRIMARY KEY,
    session_token_hash VARCHAR(128) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);

-- 2. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    owner_session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    visibility VARCHAR(16) NOT NULL DEFAULT 'public', -- 'public' or 'private'
    passcode_hash VARCHAR(128),
    owner_password_hash VARCHAR(255),
    owner_recovery_key_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'closed'
    editing_locked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 3. Room Memberships
CREATE TABLE IF NOT EXISTS room_memberships (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(32) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'participant', -- 'owner', 'participant'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_room_membership UNIQUE (room_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_room ON room_memberships(room_id);
CREATE INDEX IF NOT EXISTS idx_memberships_session ON room_memberships(session_id);

-- 4. Join Requests (for private rooms)
CREATE TABLE IF NOT EXISTS join_requests (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(32) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
    CONSTRAINT uq_join_request UNIQUE (room_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_room ON join_requests(room_id, status);

-- 5. Messages (Real-time room chat)
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(32) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
    sender_name VARCHAR(64) NOT NULL,
    message_type VARCHAR(16) NOT NULL DEFAULT 'text', -- 'text', 'code', 'file', 'system'
    content TEXT NOT NULL,
    metadata TEXT, -- JSON-stringified language, filename, code snippet info, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at);

-- 6. Shared Files
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(32) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    uploaded_by_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
    uploaded_by_name VARCHAR(64) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_room ON files(room_id);

-- 7. Workspaces (Project root for room)
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(32) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL DEFAULT 'main-project',
    project_type VARCHAR(32) NOT NULL DEFAULT 'web', -- 'web', 'python', 'cpp', 'react', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_room_workspace UNIQUE (room_id)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_room ON workspaces(room_id);

-- 8. Workspace Files (Virtual Multi-File Project Tree)
CREATE TABLE IF NOT EXISTS workspace_files (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    path VARCHAR(512) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_directory BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_file_path UNIQUE (workspace_id, path)
);

CREATE INDEX IF NOT EXISTS idx_workspace_files_ws ON workspace_files(workspace_id);

-- 9. Dependencies (Installed packages metadata)
CREATE TABLE IF NOT EXISTS dependencies (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    package_name VARCHAR(128) NOT NULL,
    version VARCHAR(64),
    environment VARCHAR(32) NOT NULL DEFAULT 'npm', -- 'npm', 'pip', 'cdn'
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_dependency UNIQUE (workspace_id, package_name, environment)
);
