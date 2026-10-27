import React, { useState } from 'react';
import {
  MicOff,
  Headphones,
  ChevronDown,
  ChevronUp,
  X,
  HelpCircle
} from 'lucide-react';
import { useAudioCall } from '../../contexts/AudioContext';

export default function AudioPermissionModal() {
  const { permissionError, clearPermissionError, joinAsListener } = useAudioCall();
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  if (!permissionError) return null;

  const currentOrigin = window.location.origin;

  return (
    <div className="modal-backdrop" onClick={clearPermissionError}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '92%',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--state-error)',
                flexShrink: 0
              }}
            >
              <MicOff size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {permissionError.title || 'Microphone Access Required'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Audio Call Setup
              </span>
            </div>
          </div>
          <button
            className="btn-icon sm btn-subtle"
            onClick={clearPermissionError}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem' }}>
          {permissionError.message}
        </p>

        {/* Primary Action: Join as Listener */}
        {permissionError.canListenOnly && (
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Headphones size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Recommended Quick Fix
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
              Join right now in <strong>Listener Mode</strong>! You will immediately hear all other participants and see speech activity without needing microphone permissions.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => {
                joinAsListener(permissionError.roomId);
              }}
            >
              <Headphones size={15} />
              <span>Join as Listener (Listen Only)</span>
            </button>
          </div>
        )}

        {/* Mobile HTTP Chrome Flag Guide Toggle */}
        {permissionError.isHttpInsecure && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowAndroidGuide(!showAndroidGuide)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.8rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HelpCircle size={14} color="var(--state-warning)" />
                Want to speak from your phone too? (Android Chrome setup)
              </span>
              {showAndroidGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAndroidGuide && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.8rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Enable Microphone on Local Wi-Fi (Android Chrome):
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>Open a new tab in Chrome on your phone.</li>
                  <li>
                    In the address bar, paste:{' '}
                    <code style={{ background: 'var(--bg-main)', padding: '2px 4px', borderRadius: '3px', color: 'var(--accent-primary)' }}>
                      chrome://flags/#unsafely-treat-insecure-origin-as-secure
                    </code>
                  </li>
                  <li>
                    Add this exact URL:{' '}
                    <code style={{ background: 'var(--bg-main)', padding: '2px 4px', borderRadius: '3px', color: 'var(--accent-primary)' }}>
                      {currentOrigin}
                    </code>
                  </li>
                  <li>Change dropdown to <strong>Enabled</strong> and tap <strong>Relaunch</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Audio Echo Tip Banner */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Headphones size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            <strong>Audio Tip:</strong> When collaborating in the same physical room, wear headphones to eliminate echo feedback between nearby microphones and speakers.
          </span>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={clearPermissionError}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
