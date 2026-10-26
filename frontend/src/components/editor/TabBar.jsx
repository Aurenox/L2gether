import React from 'react';
import { X, FileCode, Eye, User, Lock } from 'lucide-react';

export default function TabBar({
  openTabs,
  activeFilePath,
  onSelectTab,
  onCloseTab,
  isDirty,
  collaborators = [],
  lockedFiles = [],
  autoFollowHost = false,
  onToggleAutoFollow,
  isHost = false
}) {
  if (openTabs.length === 0) {
    return (
      <div className="editor-tabs-bar">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 1rem' }}>
          No file open
        </span>
      </div>
    );
  }

  return (
    <div className="editor-tabs-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {openTabs.map((path) => {
          const isActive = activeFilePath === path;
          const filename = path.split('/').pop();
          const isLocked = lockedFiles.includes('*') || lockedFiles.includes(path);

          // Find collaborators viewing this file
          const viewers = collaborators.filter((c) => c.path === path);

          return (
            <div
              key={path}
              className={`editor-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(path)}
            >
              <FileCode size={13} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
              <span>{filename}</span>

              {isLocked && (
                <Lock
                  size={11}
                  color="var(--state-warning, #f59e0b)"
                  style={{ marginLeft: '2px' }}
                  title="This file is locked by the room host"
                />
              )}

              {/* Collaborators on this tab */}
              {viewers.map((v) => (
                <span
                  key={v.sessionId}
                  className="tab-collaborator-pill"
                  title={`${v.displayName} is viewing this file`}
                >
                  <User size={9} />
                  {v.displayName}
                </span>
              ))}

              {isActive && isDirty && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)',
                    display: 'inline-block'
                  }}
                  title="Unsaved changes"
                />
              )}
              <button
                className="editor-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(path);
                }}
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Auto-Follow Host Toggle for Collaborators */}
      {!isHost && onToggleAutoFollow && (
        <button
          type="button"
          className={`follow-host-btn ${autoFollowHost ? 'active' : ''}`}
          onClick={onToggleAutoFollow}
          title={
            autoFollowHost
              ? 'Auto-follow is ON: You will switch tabs whenever the host switches'
              : 'Turn ON Auto-follow: Stay in sync with host page changes'
          }
        >
          <Eye size={12} />
          <span className="hide-on-mobile">{autoFollowHost ? 'Following Host' : 'Follow Host'}</span>
        </button>
      )}
    </div>
  );
}

